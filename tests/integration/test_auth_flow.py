from tests.integration.helpers.auth import (
    create_guest_session,
    current_user,
    login,
    logout,
)


def test_login_me_logout_cookie_session_flow(client, user_factory):
    live_user = user_factory(username="liveuser01")

    login_response = login(client, live_user["username"], live_user["password"])

    assert login_response.status_code == 200
    assert login_response.json() == {
        "success": True,
        "user_id": live_user["id"],
        "username": live_user["username"],
        "is_admin": False,
        "is_guest": False,
        "is_dry_run": False,
    }
    assert client.cookies.get("session")

    me_response = current_user(client)

    assert me_response.status_code == 200
    assert me_response.json() == {
        "user_id": live_user["id"],
        "username": live_user["username"],
        "is_admin": False,
        "is_dry_run": False,
        "is_guest": False,
        "expires_at": None,
    }

    logout_response = logout(client)

    assert logout_response.status_code == 200
    assert logout_response.json() == {"success": True}
    assert client.cookies.get("session") is None

    post_logout_me = current_user(client)

    assert post_logout_me.status_code == 401
    assert post_logout_me.json()["detail"] == "로그인이 필요합니다"


def test_guest_session_reports_guest_mode_and_cleans_up(client, db_query):
    guest_response = create_guest_session(client)

    assert guest_response.status_code == 200
    guest_body = guest_response.json()
    assert guest_body["success"] is True
    assert guest_body["is_guest"] is True
    assert guest_body["username"].startswith("guest_")
    assert client.cookies.get("session")

    me_response = current_user(client)

    assert me_response.status_code == 200
    me_body = me_response.json()
    assert me_body["user_id"] == guest_body["user_id"]
    assert me_body["username"] == guest_body["username"]
    assert me_body["is_admin"] is False
    assert me_body["is_guest"] is True
    assert me_body["is_dry_run"] is True
    assert me_body["expires_at"]

    assert db_query(
        "SELECT COUNT(*) FROM users WHERE id = %s AND is_guest = TRUE AND is_dry_run = TRUE",
        (guest_body["user_id"],),
        fetch="value",
    ) == 1
    assert db_query(
        "SELECT COUNT(*) FROM user_sessions WHERE token = %s",
        (client.cookies.get("session"),),
        fetch="value",
    ) == 1

    logout_response = logout(client, guest=True)

    assert logout_response.status_code == 200
    assert logout_response.json() == {"success": True, "guest": True}
    assert client.cookies.get("session") is None
    assert db_query(
        "SELECT COUNT(*) FROM users WHERE id = %s",
        (guest_body["user_id"],),
        fetch="value",
    ) == 0


def test_dry_run_user_login_reports_dry_mode(client, user_factory):
    dry_user = user_factory(username="dryuser01", is_dry_run=True)

    login_response = login(client, dry_user["username"], dry_user["password"])

    assert login_response.status_code == 200
    assert login_response.json()["is_guest"] is False
    assert login_response.json()["is_dry_run"] is True

    me_response = current_user(client)

    assert me_response.status_code == 200
    assert me_response.json()["user_id"] == dry_user["id"]
    assert me_response.json()["is_guest"] is False
    assert me_response.json()["is_dry_run"] is True
