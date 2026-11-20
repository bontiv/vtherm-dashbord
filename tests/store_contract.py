"""What the contract tests of the stores of add-ons share: the recorder of the answers of the real store (HACS or the Marketplace)."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any


class Recorder:  # pylint: disable=too-few-public-methods
    """Send the commands of a scenario and keep the answers."""

    def __init__(self, client, normalize: Callable[[Any], Any]) -> None:
        self.client = client
        self.normalize = normalize
        self.scenarios: dict[str, list[dict[str, Any]]] = {}

    async def call(self, scenario: str, message: dict[str, Any]) -> dict[str, Any]:
        """Send a command and record its answer, or its error."""
        await self.client.send_json_auto_id(dict(message))
        answer = await self.client.receive_json()
        exchange: dict[str, Any] = {"request": message}
        if answer["success"]:
            exchange["result"] = self.normalize(answer["result"])
        else:
            exchange["error"] = {"code": answer["error"]["code"], "message": answer["error"]["message"]}
        self.scenarios.setdefault(scenario, []).append(exchange)
        return exchange


def repository_in(exchange: dict[str, Any], full_name: str) -> dict[str, Any] | None:
    """The repository of a recorded answer of the list command, by its `owner/name`."""
    return next((item for item in exchange["result"] if item["full_name"] == full_name), None)
