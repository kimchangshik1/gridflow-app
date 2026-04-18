from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from app.auth.dependencies import get_current_user
from app.core.config import DB_URL
from app.strategy.grid_engine import GridEngine
import psycopg2

router = APIRouter()
engine = GridEngine()

def get_conn():
    return psycopg2.connect(DB_URL)


class GridStrategyRequest(BaseModel):
    exchange: str = "upbit"
    symbol: str
    base_price: float
    range_pct: float
    grid_count: int = 10
    amount_per_grid: float
    profit_gap: float = 1.0
    max_investment: Optional[float] = None
    stop_loss_price: Optional[float] = None
    daily_loss_limit: Optional[float] = None
    profit_target_pct: Optional[float] = None
    smart_sell_mode: str = "BASIC"
    split_count: int = 3
    split_ratio: str = "40,35,25"
    split_gap_pct: float = 1.0
    trailing_pct: float = 2.0
    trailing_trigger_pct: float = 1.0


@router.post("/strategies")
def create_strategy(req: GridStrategyRequest, user=Depends(get_current_user)):
    if req.base_price <= 0:
        raise HTTPException(400, "기준가는 0보다 커야 합니다")
    if req.grid_count < 2 or req.grid_count > 100:
        raise HTTPException(400, "그리드 수는 2~100 사이")
    if req.amount_per_grid < 5500:
        raise HTTPException(400, "회차별 금액 최소 5,500원")
    if req.range_pct <= 0 or req.range_pct > 50:
        raise HTTPException(400, "범위는 0~50% 사이")
    if req.smart_sell_mode not in ("BASIC", "SPLIT", "TRAILING", "BOTH"):
        raise HTTPException(400, "smart_sell_mode: BASIC / SPLIT / TRAILING / BOTH")
    if req.smart_sell_mode in ("SPLIT", "BOTH"):
        if req.split_count < 2 or req.split_count > 5:
            raise HTTPException(400, "분할익절 단계 수: 2~5")
        ratios = [float(x.strip()) for x in req.split_ratio.split(",")]
        if len(ratios) < req.split_count:
            raise HTTPException(400, f"split_ratio 항목 수가 split_count({req.split_count})보다 적습니다")

    if not user.get("is_dry_run"):
        from app.db.database import get_db
        from app.db.models import BotConfig
        from app.core.crypto import decrypt
        from sqlalchemy import select
        with get_db() as db:
            row = db.execute(
                select(BotConfig).where(
                    BotConfig.user_id == user["user_id"],
                    BotConfig.key == ("UPBIT_ACCESS_KEY" if req.exchange == "upbit" else "BITHUMB_ACCESS_KEY")
                )
            ).scalar_one_or_none()
            if not row:
                raise HTTPException(400, "API 키가 없습니다. 설정에서 API 키를 먼저 등록하세요.")
    try:
        strategy_id = engine.create_strategy(
            user_id=user["user_id"],
            exchange=req.exchange,
            symbol=req.symbol,
            base_price=req.base_price,
            range_pct=req.range_pct,
            grid_count=req.grid_count,
            amount_per_grid=req.amount_per_grid,
            profit_gap=req.profit_gap,
            max_investment=req.max_investment,
            stop_loss_price=req.stop_loss_price,
            daily_loss_limit=req.daily_loss_limit,
            profit_target_pct=req.profit_target_pct,
            smart_sell_mode=req.smart_sell_mode,
            split_count=req.split_count,
            split_ratio=req.split_ratio,
            split_gap_pct=req.split_gap_pct,
            trailing_pct=req.trailing_pct,
            trailing_trigger_pct=req.trailing_trigger_pct,
        )
        return {"success": True, "strategy_id": strategy_id}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/strategies")
def list_strategies(user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, exchange, symbol, status, base_price, range_pct,
               grid_count, amount_per_grid, profit_gap,
               total_investment, total_profit, created_at,
               smart_sell_mode, split_count, split_ratio, split_gap_pct,
               trailing_pct, trailing_trigger_pct
        FROM grid_strategies WHERE user_id = %s
        ORDER BY created_at DESC
    """, (user["user_id"],))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {"strategies": [
        {
            "id": r[0], "exchange": r[1], "symbol": r[2], "status": r[3],
            "base_price": float(r[4]), "range_pct": float(r[5]),
            "grid_count": r[6], "amount_per_grid": float(r[7]),
            "profit_gap": float(r[8]),
            "total_investment": float(r[9] or 0),
            "total_profit": float(r[10] or 0),
            "created_at": str(r[11]),
            "smart_sell_mode": r[12] or "BASIC",
            "split_count": r[13] or 3,
            "split_ratio": r[14] or "40,35,25",
            "split_gap_pct": float(r[15] or 1.0),
            "trailing_pct": float(r[16] or 2.0),
            "trailing_trigger_pct": float(r[17] or 1.0),
        }
        for r in rows
    ]}


@router.get("/strategies/{strategy_id}/orders")
def get_strategy_orders(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, grid_level, buy_price, sell_price, amount_krw,
               qty, status, profit, created_at, updated_at,
               smart_sell_step, trailing_active, trailing_high_price
        FROM grid_orders
        WHERE strategy_id=%s AND user_id=%s
        ORDER BY grid_level
    """, (strategy_id, user["user_id"]))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {"orders": [
        {
            "id": r[0], "grid_level": r[1],
            "buy_price": float(r[2]), "sell_price": float(r[3]),
            "amount_krw": float(r[4]), "qty": float(r[5] or 0),
            "status": r[6], "profit": float(r[7] or 0),
            "created_at": str(r[8]), "updated_at": str(r[9]),
            "smart_sell_step": r[10] or 0,
            "trailing_active": bool(r[11]) if r[11] else False,
            "trailing_high_price": float(r[12]) if r[12] else None,
        }
        for r in rows
    ]}


@router.post("/strategies/{strategy_id}/pause")
def pause_strategy(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "UPDATE grid_strategies SET status='PAUSED', updated_at=NOW() WHERE id=%s AND user_id=%s AND status='ACTIVE'",
        (strategy_id, user["user_id"])
    )
    updated = cur.rowcount > 0
    if updated:
        try:
            cur2 = conn.cursor()
            cur2.execute("SELECT symbol, exchange FROM grid_strategies WHERE id=%s", (strategy_id,))
            row = cur2.fetchone()
            if row:
                cur2.execute("INSERT INTO activity_logs (user_id, event_type, symbol, exchange, status, status_ko, strategy_type) VALUES (%s, 'strategy', %s, %s, %s, %s, '그리드')", (user["user_id"], row[0], row[1], 'PAUSED', '일시정지'))
            cur2.close()
        except Exception as e:
            print(f"[ACTIVITY] {e}")
    conn.commit(); cur.close(); conn.close()
    if not updated:
        raise HTTPException(404, "전략을 찾을 수 없습니다")
    return {"success": True}


@router.post("/strategies/{strategy_id}/resume")
def resume_strategy(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        "SELECT status, symbol, exchange, daily_loss_limit, stop_loss_price, daily_loss, base_price, range_pct FROM grid_strategies WHERE id=%s AND user_id=%s",
        (strategy_id, user["user_id"])
    )
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close()
        raise HTTPException(404, "전략을 찾을 수 없습니다")

    current_status, symbol, exchange, daily_loss_limit, stop_loss_price, daily_loss, base_price, range_pct = \
        row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7]

    if current_status == "STOPPED":
        cur.close(); conn.close()
        raise HTTPException(400, "종료된 전략은 재개할 수 없습니다")

    resume_block_reason = None
    current_price = engine._get_current_price(exchange, symbol)

    if stop_loss_price and current_price and float(current_price) <= float(stop_loss_price):
        resume_block_reason = f"손절가 조건 유지 중 ({current_price} <= {stop_loss_price})"

    if not resume_block_reason and current_price is not None and base_price and range_pct:
        grid_lower = float(base_price) * (1 - float(range_pct) / 100)
        grid_upper = float(base_price) * (1 + float(range_pct) / 100)
        if current_price < grid_lower:
            resume_block_reason = f"그리드 하한 이탈 중 (현재가 {current_price:.0f} < 하한 {grid_lower:.0f})"
        elif current_price > grid_upper:
            resume_block_reason = f"그리드 상한 이탈 중 (현재가 {current_price:.0f} > 상한 {grid_upper:.0f})"

    if daily_loss_limit and float(daily_loss or 0) >= float(daily_loss_limit):
        resume_block_reason = f"일일 손실 한도 초과 ({float(daily_loss or 0):.2f} / {float(daily_loss_limit):.2f})"

    if resume_block_reason:
        try:
            cur2 = conn.cursor()
            cur2.execute(
                "INSERT INTO activity_logs (user_id, event_type, symbol, exchange, status, status_ko, strategy_type) VALUES (%s, 'strategy', %s, %s, %s, %s, '그리드')",
                (user["user_id"], symbol, exchange, 'PAUSED', '재개차단')
            )
            cur2.close()
        except Exception as e:
            print(f"[ACTIVITY] {e}")
        cur.close(); conn.close()
        raise HTTPException(400, f"재개 불가: {resume_block_reason}")

    if current_status != "ACTIVE":
        cur.execute(
            "UPDATE grid_strategies SET status='ACTIVE', updated_at=NOW() WHERE id=%s AND user_id=%s",
            (strategy_id, user["user_id"])
        )

    try:
        cur2 = conn.cursor()
        cur2.execute(
            "INSERT INTO activity_logs (user_id, event_type, symbol, exchange, status, status_ko, strategy_type) VALUES (%s, 'strategy', %s, %s, %s, %s, '그리드')",
            (user["user_id"], symbol, exchange, 'ACTIVE', '실행중')
        )
        cur2.close()
    except Exception as e:
        print(f"[ACTIVITY] {e}")

    conn.commit(); cur.close(); conn.close()
    return {"success": True}

@router.post("/strategies/{strategy_id}/stop")
def stop_strategy(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()

    # 1. 전략 조회 (소유권 + 상태 확인)
    cur.execute(
        "SELECT symbol, exchange, status FROM grid_strategies WHERE id=%s AND user_id=%s",
        (strategy_id, user["user_id"])
    )
    row = cur.fetchone()
    if not row or row[2] == 'STOPPED':
        cur.close(); conn.close()
        raise HTTPException(404, "전략을 찾을 수 없습니다")
    symbol, exchange = row[0], row[1]

    # 2. 사용자 API 키 조회
    uc = None
    bc = None
    try:
        from app.db.database import get_db
        from app.db.models import BotConfig
        from app.core.crypto import decrypt
        from sqlalchemy import select as sa_select
        with get_db() as db:
            def _get_key(k):
                r = db.execute(
                    sa_select(BotConfig).where(
                        BotConfig.key == k,
                        BotConfig.user_id == user["user_id"]
                    )
                ).scalar_one_or_none()
                return decrypt(r.value) if r else None
            if exchange == "bithumb":
                ba, bs = _get_key("BITHUMB_ACCESS_KEY"), _get_key("BITHUMB_SECRET_KEY")
                if ba and bs:
                    from app.exchange.bithumb_client import BithumbClient
                    bc = BithumbClient(access_key=ba, secret_key=bs)
            else:
                ua, us = _get_key("UPBIT_ACCESS_KEY"), _get_key("UPBIT_SECRET_KEY")
                if ua and us:
                    from app.exchange.upbit_client import UpbitClient
                    uc = UpbitClient(access_key=ua, secret_key=us)
    except Exception as e:
        print(f"[GRID_STOP] 키 조회 실패: strategy_id={strategy_id} error={e}")

    # 3. 미체결 grid_orders 조회
    cur.execute(
        """SELECT id, status, buy_order_id, sell_order_id, trailing_sell_order_id, symbol
           FROM grid_orders
           WHERE strategy_id=%s AND user_id=%s AND status IN ('BUY_ORDERED', 'SELL_ORDERED')""",
        (strategy_id, user["user_id"])
    )
    live_orders = cur.fetchall()

    # 4. 거래소 취소 (best-effort)
    cancelled_ids = []
    for o in live_orders:
        oid, ostatus, buy_oid, sell_oid, trailing_oid, osymbol = o
        eid = buy_oid if ostatus == 'BUY_ORDERED' else sell_oid
        cancel_side = 'BUY' if ostatus == 'BUY_ORDERED' else 'SELL'
        if not eid:
            print(f"[GRID_STOP] 취소 불가(exchange_id 없음): grid_order_id={oid} status={ostatus}")
            continue
        try:
            if exchange == "bithumb":
                if not bc:
                    print(f"[GRID_STOP] 취소 불가(키 없음): grid_order_id={oid} status={ostatus}")
                    continue
                ok = bc.cancel_order(eid, osymbol, cancel_side)
            else:
                if not uc:
                    print(f"[GRID_STOP] 취소 불가(키 없음): grid_order_id={oid} status={ostatus}")
                    continue
                ok = uc.cancel_order(eid)
            if ok:
                cancelled_ids.append(oid)
                print(f"[GRID_STOP] 취소 성공: grid_order_id={oid} status={ostatus} exchange={exchange}")
                # trailing sell order 추가 취소 (SELL_ORDERED인 경우)
                if ostatus == 'SELL_ORDERED' and trailing_oid:
                    try:
                        if exchange == "bithumb":
                            bc.cancel_order(trailing_oid, osymbol, 'SELL')
                        else:
                            uc.cancel_order(trailing_oid)
                        print(f"[GRID_STOP] trailing 취소 성공: grid_order_id={oid}")
                    except Exception as te:
                        print(f"[GRID_STOP] trailing 취소 실패: grid_order_id={oid} error={te}")
            else:
                print(f"[GRID_STOP] 취소 거절: grid_order_id={oid} status={ostatus} exchange={exchange}")
        except Exception as e:
            print(f"[GRID_STOP] 취소 오류: grid_order_id={oid} status={ostatus} error={str(e)[:120]}")

    # 5. 취소 성공 주문 DB 갱신
    if cancelled_ids:
        placeholders = ','.join(['%s'] * len(cancelled_ids))
        cur.execute(
            f"UPDATE grid_orders SET status='CANCELLED', updated_at=NOW() WHERE id IN ({placeholders})",
            cancelled_ids
        )

    # 6. 전략 상태 STOPPED
    cur.execute(
        "UPDATE grid_strategies SET status='STOPPED', updated_at=NOW() WHERE id=%s AND user_id=%s",
        (strategy_id, user["user_id"])
    )

    # 7. activity_logs 기록
    try:
        cur2 = conn.cursor()
        cur2.execute(
            "INSERT INTO activity_logs (user_id, event_type, symbol, exchange, status, status_ko, strategy_type) VALUES (%s, 'strategy', %s, %s, %s, %s, '그리드')",
            (user["user_id"], symbol, exchange, 'STOPPED', '종료')
        )
        cur2.close()
    except Exception as e:
        print(f"[ACTIVITY] {e}")

    conn.commit()
    cur.close()
    conn.close()
    return {"success": True}


@router.delete("/strategies/{strategy_id}/delete")
def delete_strategy(strategy_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM grid_orders WHERE strategy_id=%s AND user_id=%s", (strategy_id, user["user_id"]))
    cur.execute("DELETE FROM grid_strategies WHERE id=%s AND user_id=%s AND status='STOPPED'", (strategy_id, user["user_id"]))
    deleted = cur.rowcount > 0
    conn.commit(); cur.close(); conn.close()
    if not deleted:
        raise HTTPException(400, "삭제 실패 (종료된 전략만 삭제 가능)")
    return {"success": True}


@router.put("/strategies/{strategy_id}")
def update_strategy(strategy_id: int, req: GridStrategyRequest, user=Depends(get_current_user)):
    if req.range_pct <= 0 or req.range_pct > 50:
        raise HTTPException(400, "범위는 0~50% 사이")
    if req.base_price <= 0:
        raise HTTPException(400, "기준가는 0보다 커야 합니다")

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT status FROM grid_strategies WHERE id=%s AND user_id=%s",
        (strategy_id, user["user_id"])
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(404, "전략을 찾을 수 없습니다")
    if row[0] != "PAUSED":
        raise HTTPException(400, "일시정지 상태에서만 수정 가능합니다")

    cur.execute("""
        UPDATE grid_strategies SET
        base_price=%s, range_pct=%s, grid_count=%s,
        amount_per_grid=%s, profit_gap=%s,
        smart_sell_mode=%s, split_count=%s, split_ratio=%s, split_gap_pct=%s,
        trailing_pct=%s, trailing_trigger_pct=%s,
        updated_at=NOW()
        WHERE id=%s AND user_id=%s
    """, (req.base_price, req.range_pct, req.grid_count,
          req.amount_per_grid, req.profit_gap,
          req.smart_sell_mode, req.split_count, req.split_ratio, req.split_gap_pct,
          req.trailing_pct, req.trailing_trigger_pct,
          strategy_id, user["user_id"]))

    cur.execute("DELETE FROM grid_orders WHERE strategy_id=%s AND status='WAITING'", (strategy_id,))
    lower = float(req.base_price) * (1 - float(req.range_pct) / 100)
    upper = float(req.base_price) * (1 + float(req.range_pct) / 100)
    step = (upper - lower) / req.grid_count
    for i in range(req.grid_count):
        buy_price = round(lower + step * i, 2)
        sell_price = round(buy_price + float(req.profit_gap), 2)
        qty = round(float(req.amount_per_grid) / buy_price, 8)
        cur.execute("""
            INSERT INTO grid_orders
            (strategy_id, user_id, exchange, symbol, side, grid_level,
             buy_price, sell_price, amount_krw, qty, status)
            VALUES (%s, %s, %s, %s, 'BUY', %s, %s, %s, %s, %s, 'WAITING')
        """, (strategy_id, user["user_id"], req.exchange, req.symbol,
              i+1, buy_price, sell_price, req.amount_per_grid, qty))
    conn.commit(); cur.close(); conn.close()
    return {"success": True}


@router.get("/logs")
def get_strategy_logs(
    user=Depends(get_current_user),
    strategy_type: str = "ALL",
    limit: int = 200
):
    """전략 실행 로그 통합 조회 (그리드 + DCA)"""
    conn = get_conn()
    cur = conn.cursor()
    logs = []

    # 그리드 체결 로그
    if strategy_type in ("ALL", "GRID"):
        cur.execute("""
            SELECT
                go.id, gs.symbol, gs.exchange,
                go.side, go.buy_price, go.sell_price,
                go.qty, go.amount_krw, go.profit,
                go.status, go.grid_level,
                go.updated_at,
                'GRID' as strategy_type,
                gs.id as strategy_id,
                go.smart_sell_step,
                gs.smart_sell_mode
            FROM grid_orders go
            JOIN grid_strategies gs ON gs.id = go.strategy_id
            WHERE gs.user_id = %s
              AND go.status IN ('SELL_FILLED', 'WAITING')
              AND go.profit IS NOT NULL
              AND go.profit != 0
            ORDER BY go.updated_at DESC
            LIMIT %s
        """, (user["user_id"], limit))
        for r in cur.fetchall():
            logs.append({
                "id": f"grid-{r[0]}",
                "strategy_type": "GRID",
                "strategy_id": r[13],
                "symbol": r[1],
                "exchange": r[2],
                "side": "SELL",
                "price": float(r[5] or 0),
                "qty": float(r[6] or 0),
                "amount_krw": float(r[7] or 0),
                "profit": float(r[8] or 0),
                "status": r[9],
                "detail": f"그리드 Lv.{r[10]} | {r[15] or 'BASIC'}",
                "at": str(r[11]),
            })

    # DCA 체결 로그
    if strategy_type in ("ALL", "DCA"):
        cur.execute("""
            SELECT
                dco.id, ds.symbol, ds.exchange,
                dco.price, dco.amount_krw, dco.qty,
                dco.status, dco.round_num,
                dco.created_at,
                ds.id as strategy_id,
                ds.strategy_type
            FROM dca_orders dco
            JOIN dca_strategies ds ON ds.id = dco.strategy_id
            WHERE ds.user_id = %s
              AND dco.status = 'FILLED'
            ORDER BY dco.created_at DESC
            LIMIT %s
        """, (user["user_id"], limit))
        for r in cur.fetchall():
            logs.append({
                "id": f"dca-{r[0]}",
                "strategy_type": "DCA",
                "strategy_id": r[9],
                "symbol": r[1],
                "exchange": r[2],
                "side": "BUY",
                "price": float(r[3] or 0),
                "qty": float(r[5] or 0),
                "amount_krw": float(r[4] or 0),
                "profit": None,
                "status": r[6],
                "detail": f"{r[10]} {r[7]}회차 매수",
                "at": str(r[8]),
            })

    # 수동 주문 체결 로그
    if strategy_type == "ALL":
        cur.execute("""
            SELECT
                id, symbol, exchange, side, price, amount_krw,
                status, status_ko, created_at
            FROM activity_logs
            WHERE user_id = %s
              AND event_type = 'manual_order'
              AND status = 'FILLED'
            ORDER BY created_at DESC
            LIMIT %s
        """, (user["user_id"], limit))
        for r in cur.fetchall():
            logs.append({
                "id": f"manual-{r[0]}",
                "strategy_type": "MANUAL",
                "strategy_id": None,
                "symbol": r[1],
                "exchange": r[2],
                "side": r[3],
                "price": float(r[4] or 0),
                "qty": 0,
                "amount_krw": float(r[5] or 0),
                "profit": None,
                "status": r[6],
                "detail": r[7] or "수동 주문 체결",
                "at": str(r[8]),
            })

    cur.close()
    conn.close()

    # 시간순 정렬
    logs.sort(key=lambda x: x["at"], reverse=True)
    logs = logs[:limit]

    # 요약 통계
    grid_profits = [l["profit"] for l in logs if l["strategy_type"] == "GRID" and l["profit"] is not None]
    total_profit = sum(grid_profits)
    win_count = sum(1 for p in grid_profits if p > 0)
    loss_count = sum(1 for p in grid_profits if p < 0)

    return {
        "logs": logs,
        "summary": {
            "total": len(logs),
            "total_profit": round(total_profit, 2),
            "win_count": win_count,
            "loss_count": loss_count,
            "win_rate": round(win_count / len(grid_profits) * 100, 1) if grid_profits else 0,
        }
    }
