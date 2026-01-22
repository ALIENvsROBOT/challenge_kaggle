# Project Setup with uv

This project uses [uv](https://github.com/astral-sh/uv) for extremely fast, reliable dependency management. This ensures that all developers are using the exact same versions of packages.

## 1. Install uv

**Windows (PowerShell):**

```powershell
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**Linux / macOS:**

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

_Don't forget to restart your terminal after installation if the `uv` command is not found._

## 2. Set Up the Project

Navigate to the project directory and run:

```sh
uv sync
```

This command will:

1.  Create a virtual environment (`.venv`) if one doesn't exist.
2.  Install all dependencies defined in `uv.lock` exactly as specified.

## 3. Running Code

You can run scripts using `uv run`, which automatically uses the correct environment:

```sh
uv run Test/Test_medgemma_api.py
```

Or you can activate the virtual environment manually:

- **Windows**: `.\.venv\Scripts\activate`
- **Linux/Mac**: `source .venv/bin/activate`

## 4. Managing Dependencies

To add a new library (this will automatically update `pyproject.toml` and `uv.lock`):

```sh
uv add <package_name>
```

**Example:**

```sh
uv add pandas
```

**Important**: Always commit `pyproject.toml` and `uv.lock` to Git. This ensures other developers get the exact same environment when they run `uv sync`.
