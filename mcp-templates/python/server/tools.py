"""
在這裡新增你自己的工具，接你的 ERP / 資料庫 / 檔案系統。

每個工具用 @mcp.tool() 裝飾器註冊：
  - 函式名稱即工具名稱（顯示在 myPDA UI）
  - docstring 即工具描述
  - 型別註記即參數 schema（FastMCP 自動產生 inputSchema）
  - 回傳值會被包成 MCP 文字內容

下面四個是示範工具，可以照樣改成你自己的。
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from pydantic import Field

# 用 Field(examples=[...]) 為參數附上「可運行的範例值」。
# 這些範例會進到工具的 inputSchema，myPDA 測試頁會自動帶入，
# 讓使用者不必對著空白框猜要填什麼（改成你自己的工具時也照樣加）。


def register_tools(mcp) -> None:
    """把所有工具註冊到傳入的 FastMCP 實例上。"""

    # ping：無參數，回傳 "pong"。最小的連線健康測試。
    @mcp.tool()
    def ping() -> str:
        """Health check. Returns 'pong'."""
        return "pong"

    # echo：回傳傳入的同一段文字。
    @mcp.tool()
    def echo(text: Annotated[str, Field(examples=["hello"])]) -> str:
        """Echo back the given text."""
        return text

    # server_time：回傳目前時間（ISO 8601）與伺服器時區。
    @mcp.tool()
    def server_time() -> str:
        """Current server time as ISO 8601 string plus the server timezone."""
        now = datetime.now().astimezone()
        tz = now.tzinfo.tzname(now) if now.tzinfo else timezone.utc.tzname(None)
        return f"{now.isoformat()} ({tz})"

    # add：把兩個數字相加，回傳總和。
    @mcp.tool()
    def add(
        a: Annotated[float, Field(examples=[2])],
        b: Annotated[float, Field(examples=[3])],
    ) -> float:
        """Add two numbers and return the sum."""
        return a + b
