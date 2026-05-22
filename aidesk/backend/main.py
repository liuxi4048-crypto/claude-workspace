from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import anthropic
import json
import os
from pathlib import Path
from datetime import datetime
import uuid
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AIDesk API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = Path(__file__).parent / "orders.json"

def load_orders():
    if DATA_FILE.exists():
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    return []

def save_orders(orders):
    DATA_FILE.write_text(json.dumps(orders, ensure_ascii=False, indent=2), encoding="utf-8")


class OrderCreate(BaseModel):
    client_name: str
    service_type: str
    plan: str
    amount: int
    details: str
    deadline: str


class GenerateRequest(BaseModel):
    order_id: str


class StatusUpdate(BaseModel):
    status: str


SERVICE_PROMPTS = {
    "proposal": "提案書・営業資料",
    "report": "レポート・報告書",
    "lp": "LP・セールスコピー",
    "minutes": "議事録・会議メモ",
    "other": "その他ビジネス文書",
}


@app.get("/api/orders")
def get_orders():
    return load_orders()


@app.post("/api/orders")
def create_order(order: OrderCreate):
    orders = load_orders()
    new_order = {
        "id": str(uuid.uuid4())[:8],
        "client_name": order.client_name,
        "service_type": order.service_type,
        "plan": order.plan,
        "amount": order.amount,
        "details": order.details,
        "deadline": order.deadline,
        "status": "received",
        "created_at": datetime.now().isoformat(),
        "generated_content": None,
    }
    orders.insert(0, new_order)
    save_orders(orders)
    return new_order


@app.post("/api/orders/{order_id}/generate")
def generate_content(order_id: str):
    orders = load_orders()
    order = next((o for o in orders if o["id"] == order_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")

    client = anthropic.Anthropic(api_key=api_key)
    service_label = SERVICE_PROMPTS.get(order["service_type"], "ビジネス文書")

    prompt = f"""あなたはプロのビジネスライターです。
以下の依頼内容に基づいて、高品質な{service_label}を作成してください。

【クライアント名】{order["client_name"]}
【プラン】{order["plan"]}
【依頼内容】
{order["details"]}

---

プロとして、説得力があり実用的な文書を作成してください。
構成は見やすく、見出し・箇条書きを適切に使用してください。
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    generated = message.content[0].text
    order["generated_content"] = generated
    order["status"] = "generated"
    save_orders(orders)
    return {"content": generated, "order": order}


@app.patch("/api/orders/{order_id}/status")
def update_status(order_id: str, body: StatusUpdate):
    orders = load_orders()
    order = next((o for o in orders if o["id"] == order_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order["status"] = body.status
    save_orders(orders)
    return order


@app.get("/api/stats")
def get_stats():
    orders = load_orders()
    total_revenue = sum(o["amount"] for o in orders if o["status"] == "delivered")
    return {
        "total_orders": len(orders),
        "received": sum(1 for o in orders if o["status"] == "received"),
        "generated": sum(1 for o in orders if o["status"] == "generated"),
        "delivered": sum(1 for o in orders if o["status"] == "delivered"),
        "total_revenue": total_revenue,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
