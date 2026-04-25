from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from app.api.validation import normalize_market_symbol
from app.auth.dependencies import get_current_user
from app.core.config import DB_URL
import psycopg2

router = APIRouter()

def get_conn():
    return psycopg2.connect(DB_URL)


def _load_user_exchange_keys(user_id: int, exchange: str):
    from app.core.crypto import decrypt

    if exchange == "upbit":
        access_key_name = "UPBIT_ACCESS_KEY"
        secret_key_name = "UPBIT_SECRET_KEY"
    elif exchange == "bithumb":
        access_key_name = "BITHUMB_ACCESS_KEY"
        secret_key_name = "BITHUMB_SECRET_KEY"
    else:
        return None, None

    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT
                MAX(CASE WHEN key = %s THEN value END) AS access_enc,
                MAX(CASE WHEN key = %s THEN value END) AS secret_enc
            FROM bot_configs
            WHERE user_id = %s
        """, (access_key_name, secret_key_name, user_id))
        row = cur.fetchone()
    finally:
        cur.close()
        conn.close()

    if not row:
        return None, None

    access_enc, secret_enc = row
    access_key = decrypt(access_enc) if access_enc else None
    secret_key = decrypt(secret_enc) if secret_enc else None
    return access_key, secret_key


def _build_rebal_engine_for_user(user_id: int, username: str, exchange: str, is_dry_run: bool):
    from app.bot_manager import UserBotManager, UserBot
    from app.strategy.rebalancing_engine import RebalancingEngine

    if is_dry_run:
        return RebalancingEngine(), None

    access_key, secret_key = _load_user_exchange_keys(user_id, exchange)
    if not access_key or not secret_key:
        return None, "API 클라이언트를 준비할 수 없습니다"

    user_manager = UserBotManager(interval_sec=30)
    if exchange == "upbit":
        user_bot = UserBot(
            user_id=user_id,
            username=username,
            upbit_access=access_key,
            upbit_secret=secret_key,
        )
    else:
        user_bot = UserBot(
            user_id=user_id,
            username=username,
            upbit_access=None,
            upbit_secret=None,
            bithumb_access=access_key,
            bithumb_secret=secret_key,
        )
    user_manager._user_bots[user_id] = user_bot
    return RebalancingEngine(user_manager=user_manager), None


class AssetItem(BaseModel):
    symbol: str
    target_pct: float

class RebalStrategyRequest(BaseModel):
    exchange: str = "upbit"
    name: str = "내 포트폴리오"
    trigger_type: str = "INTERVAL"
    interval_hours: float = 24.0
    threshold_pct: float = 5.0
    assets: List[AssetItem]
    # 리밸런싱 방식
    rebal_method: str = "BOTH"          # BUY_ONLY / BOTH / NEW_FUND
    min_order_krw: float = 10000        # 최소 주문 금액
    max_adjust_pct: float = 25.0        # 최대 1회 조정 비율 (%)
    max_adjust_krw: Optional[float] = None  # 최대 1회 조정 절대값
    use_new_fund: bool = False          # 신규 자금 자동 반영
    # 리스크 제한
    daily_max_count: int = 10           # 하루 최대 조정 횟수
    daily_max_krw: Optional[float] = None   # 하루 최대 주문 금액
    asset_max_pct: float = 80.0         # 특정 자산 최대 비중 상한
    asset_min_pct: float = 5.0          # 특정 자산 최소 비중 하한
    error_stop_count: int = 3           # API 오류 N회 시 정지


def _validate_rebalancing_request(req: RebalStrategyRequest):
    if req.exchange not in ("upbit", "bithumb"):
        raise HTTPException(400, "exchange는 upbit 또는 bithumb")
    if not req.name or not req.name.strip():
        raise HTTPException(400, "name이 비어 있습니다")
    total_pct = sum(a.target_pct for a in req.assets)
    if abs(total_pct - 100) > 1:
        raise HTTPException(400, f"비중 합계가 100%가 아닙니다 (현재: {total_pct:.1f}%)")
    if len(req.assets) < 2:
        raise HTTPException(400, "최소 2개 이상의 종목이 필요합니다")
    if len(req.assets) > 5:
        raise HTTPException(400, "종목은 최대 5개까지 가능합니다")
    if req.trigger_type not in ("INTERVAL", "THRESHOLD", "BOTH"):
        raise HTTPException(400, "trigger_type: INTERVAL / THRESHOLD / BOTH")
    if req.rebal_method not in ("BUY_ONLY", "BOTH", "NEW_FUND"):
        raise HTTPException(400, "rebal_method: BUY_ONLY / BOTH / NEW_FUND")
    if req.threshold_pct <= 0 or req.threshold_pct > 100:
        raise HTTPException(400, "threshold_pct는 0~100 사이")
    if req.min_order_krw < 5500:
        raise HTTPException(400, "최소 주문 금액은 5,500원 이상이어야 합니다")
    if req.interval_hours < 6:
        raise HTTPException(400, "실행 주기는 최소 6시간 이상이어야 합니다")
    if req.max_adjust_pct <= 0 or req.max_adjust_pct > 100:
        raise HTTPException(400, "max_adjust_pct는 0~100 사이")
    if req.max_adjust_krw is not None and req.max_adjust_krw <= 0:
        raise HTTPException(400, "max_adjust_krw는 0보다 커야 합니다")
    if req.daily_max_count < 1:
        raise HTTPException(400, "daily_max_count는 1 이상이어야 합니다")
    if req.daily_max_krw is not None and req.daily_max_krw <= 0:
        raise HTTPException(400, "daily_max_krw는 0보다 커야 합니다")
    if req.asset_min_pct <= 0 or req.asset_min_pct > 100:
        raise HTTPException(400, "asset_min_pct는 0~100 사이")
    if req.asset_max_pct <= 0 or req.asset_max_pct > 100:
        raise HTTPException(400, "asset_max_pct는 0~100 사이")
    if req.asset_min_pct > req.asset_max_pct:
        raise HTTPException(400, "asset_min_pct는 asset_max_pct보다 클 수 없습니다")
    if req.error_stop_count < 1:
        raise HTTPException(400, "error_stop_count는 1 이상이어야 합니다")
    symbols = []
    for asset in req.assets:
        asset.symbol = normalize_market_symbol(asset.symbol, field_name="asset symbol")
        if asset.target_pct <= 0 or asset.target_pct > 100:
            raise HTTPException(400, f"{asset.symbol} 비중은 0~100 사이여야 합니다")
        if asset.target_pct < 10:
            raise HTTPException(400, f"{asset.symbol} 비중이 너무 낮습니다 (최소 10%)")
        if asset.target_pct > req.asset_max_pct:
            raise HTTPException(400, f"{asset.symbol} 비중이 asset_max_pct를 초과합니다")
        symbols.append(asset.symbol)
    if len(symbols) != len(set(symbols)):
        raise HTTPException(400, "중복 종목이 있습니다")


@router.post("/strategies")
def create_strategy(req: RebalStrategyRequest, user=Depends(get_current_user)):
    _validate_rebalancing_request(req)

    if not user.get("is_dry_run"):
        from app.db.database import get_db
        from app.db.models import BotConfig
        from app.core.crypto import decrypt
        from sqlalchemy import select
        with get_db() as db:
            access_row = db.execute(
                select(BotConfig).where(
                    BotConfig.user_id == user["user_id"],
                    BotConfig.key == ("UPBIT_ACCESS_KEY" if req.exchange == "upbit" else "BITHUMB_ACCESS_KEY")
                )
            ).scalar_one_or_none()
            if not access_row:
                raise HTTPException(400, "API 키가 없습니다. 설정에서 API 키를 먼저 등록하세요.")
            secret_row = db.execute(
                select(BotConfig).where(
                    BotConfig.user_id == user["user_id"],
                    BotConfig.key == ("UPBIT_SECRET_KEY" if req.exchange == "upbit" else "BITHUMB_SECRET_KEY")
                )
            ).scalar_one_or_none()
            access_key = decrypt(access_row.value) if access_row and access_row.value else ""
            secret_key = decrypt(secret_row.value) if secret_row and secret_row.value else ""
            if not access_key:
                raise HTTPException(400, "API 키가 없습니다. 설정에서 API 키를 먼저 등록하세요.")
            if not secret_key:
                raise HTTPException(400, "API 시크릿 키가 없습니다. 설정에서 API 키를 먼저 등록하세요.")

    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO rebalancing_strategies
            (user_id, exchange, name, trigger_type, interval_hours, threshold_pct, status,
             rebal_method, min_order_krw, max_adjust_pct, max_adjust_krw, use_new_fund,
             daily_max_count, daily_max_krw, asset_max_pct, asset_min_pct, error_stop_count)
            VALUES (%s, %s, %s, %s, %s, %s, 'ACTIVE',
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (user["user_id"], req.exchange, req.name,
              req.trigger_type, req.interval_hours, req.threshold_pct,
              req.rebal_method, req.min_order_krw, req.max_adjust_pct,
              req.max_adjust_krw, req.use_new_fund,
              req.daily_max_count, req.daily_max_krw,
              req.asset_max_pct, req.asset_min_pct, req.error_stop_count))
        strategy_id = cur.fetchone()[0]

        for asset in req.assets:
            cur.execute("""
                INSERT INTO rebalancing_assets
                (strategy_id, user_id, symbol, target_pct)
                VALUES (%s, %s, %s, %s)
            """, (strategy_id, user["user_id"], asset.symbol.upper(), asset.target_pct))

        conn.commit()
        return {"success": True, "strategy_id": strategy_id}
    except Exception as e:
        conn.rollback()
        print(f"[REBAL] 전략 생성 오류: {e}")
        raise HTTPException(500, "요청 처리 중 오류가 발생했습니다")
    finally:
        cur.close()
        conn.close()


@router.get("/strategies")
def list_strategies(user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, exchange, name, status, trigger_type,
               interval_hours, threshold_pct,
               total_value_krw, last_rebal_at, rebal_count, created_at,
               rebal_method, min_order_krw, max_adjust_pct, use_new_fund,
               daily_max_count, asset_max_pct, asset_min_pct
        FROM rebalancing_strategies
        WHERE user_id=%s ORDER BY created_at DESC
    """, (user["user_id"],))
    rows = cur.fetchall()
    strategies = []
    for r in rows:
        strat_id = r[0]
        cur.execute("""
            SELECT symbol, target_pct, current_pct, current_qty,
                   current_value_krw, avg_price
            FROM rebalancing_assets
            WHERE strategy_id=%s ORDER BY target_pct DESC
        """, (strat_id,))
        assets = cur.fetchall()
        strategies.append({
            "id": strat_id,
            "exchange": r[1], "name": r[2], "status": r[3],
            "trigger_type": r[4],
            "interval_hours": float(r[5] or 24),
            "threshold_pct": float(r[6] or 5),
            "total_value_krw": float(r[7] or 0),
            "last_rebal_at": str(r[8]) if r[8] else None,
            "rebal_count": r[9] or 0,
            "created_at": str(r[10]),
            "rebal_method": r[11] or "BOTH",
            "min_order_krw": float(r[12] or 10000),
            "max_adjust_pct": float(r[13] or 25),
            "use_new_fund": bool(r[14]) if r[14] else False,
            "daily_max_count": r[15] or 10,
            "asset_max_pct": float(r[16] or 80),
            "asset_min_pct": float(r[17] or 5),
            "assets": [
                {
                    "symbol": a[0],
                    "target_pct": float(a[1]),
                    "current_pct": float(a[2] or 0),
                    "current_qty": float(a[3] or 0),
                    "current_value_krw": float(a[4] or 0),
                    "avg_price": float(a[5] or 0),
                }
                for a in assets
            ]
        })
    cur.close()
    conn.close()
    return {"strategies": strategies}


@router.get("/strategies/{strategy_id}/orders")
def get_orders(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT symbol, side, price, amount_krw, qty,
               before_pct, after_pct, target_pct, status, created_at
        FROM rebalancing_orders
        WHERE strategy_id=%s AND user_id=%s
        ORDER BY created_at DESC LIMIT 100
    """, (strategy_id, user["user_id"]))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {"orders": [
        {
            "symbol": r[0], "side": r[1],
            "price": float(r[2] or 0), "amount_krw": float(r[3] or 0),
            "qty": float(r[4] or 0),
            "before_pct": float(r[5] or 0), "after_pct": float(r[6] or 0),
            "target_pct": float(r[7] or 0),
            "status": r[8], "created_at": str(r[9])
        }
        for r in rows
    ]}


@router.post("/strategies/{strategy_id}/pause")
def pause_strategy(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "UPDATE rebalancing_strategies SET status='PAUSED', updated_at=NOW() WHERE id=%s AND user_id=%s",
        (strategy_id, user["user_id"])
    )
    updated = cur.rowcount > 0
    conn.commit(); cur.close(); conn.close()
    if not updated:
        raise HTTPException(404, "전략을 찾을 수 없습니다")
    return {"success": True}


@router.post("/strategies/{strategy_id}/resume")
def resume_strategy(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "UPDATE rebalancing_strategies SET status='ACTIVE', updated_at=NOW() WHERE id=%s AND user_id=%s",
        (strategy_id, user["user_id"])
    )
    updated = cur.rowcount > 0
    conn.commit(); cur.close(); conn.close()
    if not updated:
        raise HTTPException(404, "전략을 찾을 수 없습니다")
    return {"success": True}


@router.delete("/strategies/{strategy_id}")
def stop_strategy(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "UPDATE rebalancing_strategies SET status='STOPPED', updated_at=NOW() WHERE id=%s AND user_id=%s",
        (strategy_id, user["user_id"])
    )
    updated = cur.rowcount > 0
    conn.commit(); cur.close(); conn.close()
    if not updated:
        raise HTTPException(404, "전략을 찾을 수 없습니다")
    return {"success": True}


@router.delete("/strategies/{strategy_id}/delete")
def delete_strategy(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM rebalancing_orders WHERE strategy_id=%s AND user_id=%s",
                (strategy_id, user["user_id"]))
    cur.execute("DELETE FROM rebalancing_assets WHERE strategy_id=%s AND user_id=%s",
                (strategy_id, user["user_id"]))
    cur.execute(
        "DELETE FROM rebalancing_strategies WHERE id=%s AND user_id=%s AND status='STOPPED'",
        (strategy_id, user["user_id"])
    )
    deleted = cur.rowcount > 0
    conn.commit(); cur.close(); conn.close()
    if not deleted:
        raise HTTPException(400, "삭제 실패 (종료된 전략만 삭제 가능)")
    return {"success": True}


@router.post("/strategies/{strategy_id}/rebalance-now")
def rebalance_now(strategy_id: int, user=Depends(get_current_user)):
    """즉시 리밸런싱 강제 실행"""
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT exchange, status
            FROM rebalancing_strategies
            WHERE id=%s AND user_id=%s
        """, (strategy_id, user["user_id"]))
        row = cur.fetchone()
    finally:
        cur.close()
        conn.close()

    if not row:
        raise HTTPException(404, "전략을 찾을 수 없습니다")

    exchange, status = row
    if status != "ACTIVE":
        raise HTTPException(409, f"ACTIVE 전략만 즉시 실행할 수 있습니다 (현재: {status})")

    engine, engine_error = _build_rebal_engine_for_user(
        user_id=user["user_id"],
        username=user.get("username") or f"user-{user['user_id']}",
        exchange=exchange,
        is_dry_run=bool(user.get("is_dry_run")),
    )
    if not engine:
        print(
            f"[REBAL] 즉시 실행 skip: strategy_id={strategy_id} "
            f"user_id={user['user_id']} exchange={exchange} reason={engine_error}"
        )
        raise HTTPException(409, engine_error)

    result = engine.execute_strategy_now(strategy_id, user["user_id"])
    reason = result.get("reason")
    if not result.get("success"):
        if reason == "not_found":
            raise HTTPException(404, "전략을 찾을 수 없습니다")
        if reason == "inactive_status":
            raise HTTPException(409, f"ACTIVE 전략만 즉시 실행할 수 있습니다 (현재: {result.get('status')})")
        if reason == "already_running":
            raise HTTPException(409, "이미 실행 중인 전략입니다. 잠시 후 다시 시도하세요")
        if reason == "client_not_ready":
            raise HTTPException(409, "거래소 클라이언트가 준비되지 않아 즉시 실행할 수 없습니다")
        if reason == "no_assets":
            raise HTTPException(409, "전략 자산 정보가 없어 즉시 실행할 수 없습니다")
        if reason == "price_unavailable":
            raise HTTPException(503, "현재가를 가져오지 못해 즉시 실행할 수 없습니다")
        if reason == "portfolio_value_too_low":
            total_value = float(result.get("total_value") or 0)
            raise HTTPException(409, f"포트폴리오 가치가 부족해 즉시 실행할 수 없습니다 ({total_value:,.0f}원)")
        if reason == "daily_max_krw_reached":
            daily_used_krw = float(result.get("daily_used_krw") or 0)
            daily_max_krw = float(result.get("daily_max_krw") or 0)
            raise HTTPException(
                409,
                f"하루 최대 주문 금액 제한에 도달해 즉시 실행할 수 없습니다 "
                f"({daily_used_krw:,.0f}/{daily_max_krw:,.0f}원)"
            )
        if reason == "new_fund_mode_unsupported":
            raise HTTPException(
                409,
                "NEW_FUND 방식은 신규 자금 기준이 현재 런타임에 정의되지 않아 즉시 실행할 수 없습니다"
            )
        detail = result.get("detail") or "즉시 실행 중 오류가 발생했습니다"
        raise HTTPException(500, detail)

    submitted_orders = int(result.get("submitted_orders") or 0)
    failed_orders = int(result.get("failed_orders") or 0)
    if submitted_orders or failed_orders:
        message = f"즉시 리밸런싱 실행 완료 (제출 {submitted_orders}건"
        if failed_orders:
            message += f", 실패 {failed_orders}건"
        message += ")"
    else:
        message = "즉시 리밸런싱 실행 완료"

    return {
        "success": True,
        "message": message,
        "submitted_orders": submitted_orders,
        "failed_orders": failed_orders,
        "total_value_krw": float(result.get("total_value") or 0),
    }
