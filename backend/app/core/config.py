from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    cors_origins: str = "http://localhost:3000,http://localhost:3001,https://erp-software-pied.vercel.app"

    # Supabase Auth (GoTrue REST API) — see app/core/supabase_auth.py. supabase_url is the
    # project's base URL (e.g. https://<ref>.supabase.co); the service role key is required for
    # admin_create_user/admin_send_password_reset and must never reach the frontend.
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        cleaned = []
        for o in self.cors_origins.split(","):
            o = o.strip()
            if "[" in o and "](" in o:
                # extract URL inside [text](url) markdown syntax
                o = o.split("](")[-1].rstrip(")")
            if o:
                cleaned.append(o)
        return cleaned

    @property
    def sqlalchemy_database_url(self) -> str:
        url = self.database_url.strip()
        if url.startswith("postgres://"):
            url = "postgresql+psycopg2://" + url[len("postgres://"):]
        elif url.startswith("postgresql://"):
            url = "postgresql+psycopg2://" + url[len("postgresql://"):]

        if "postgresql" in url and "sslmode" not in url and "localhost" not in url and "127.0.0.1" not in url:
            sep = "&" if "?" in url else "?"
            url = f"{url}{sep}sslmode=require"
        return url


settings = Settings()

