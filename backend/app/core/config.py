from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://tender:tender@localhost:5432/tender_db"

    # DeepSeek (OpenAI-compatible)
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"
    deepseek_timeout_seconds: float = 20.0

    embed_model: str = "intfloat/multilingual-e5-large"
    embed_allow_fallback: bool = True
    docs_dir: str = "data/docs"
    pricelists_dir: str = "data/pricelists"
    debug: bool = False
    log_level: str = "info"


settings = Settings()
