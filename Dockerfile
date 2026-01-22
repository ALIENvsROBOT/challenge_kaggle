# Use a Python image with uv pre-installed
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

# Set the working directory
WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy the dependency files first to leverage Docker caching
COPY pyproject.toml uv.lock ./

# Install dependencies
# --frozen: ensures we strictly follow the lockfile (no updates)
# --no-dev: skips development dependencies (if any)
RUN uv sync --frozen --no-dev

# Copy the rest of the application code
COPY . .

# Place the virtual environment in the PATH
# uv creates the venv at .venv by default, and we can just add it to path
ENV PATH="/app/.venv/bin:$PATH"

# Run the application
CMD ["python", "Test/Test_medgemma_api.py"]
