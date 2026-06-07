# API Specification

## Current Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Health check endpoint |
| `GET` | `/api/v1/status` | Agent status endpoint |
| `POST` | `/api/v1/chat` | Send a message to the AI agent |

## Chat Request

```json
{
  "message": "Hello"
}
```

## Chat Response

```json
{
  "response": "Agent response",
  "analysis": "Internal analysis"
}
```

