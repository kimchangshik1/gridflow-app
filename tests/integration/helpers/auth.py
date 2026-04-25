STATE_CHANGE_HEADERS = {"X-GridFlow-State-Change": "1"}


def state_change_headers(**extra_headers):
    headers = dict(STATE_CHANGE_HEADERS)
    headers.update(extra_headers)
    return headers


def login(client, username: str, password: str):
    return client.post(
        "/auth/login",
        json={"username": username, "password": password},
        headers=STATE_CHANGE_HEADERS,
    )


def create_guest_session(client):
    return client.post("/auth/guest/session", headers=STATE_CHANGE_HEADERS)


def current_user(client):
    return client.get("/auth/me")


def logout(client, *, guest: bool = False):
    path = "/auth/guest/logout" if guest else "/auth/logout"
    return client.post(path, headers=STATE_CHANGE_HEADERS)
