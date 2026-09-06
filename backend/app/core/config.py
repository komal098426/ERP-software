from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://postgres.kujdorplejooezjspbcv:khaommiald3116@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    cors_origins: str = "http://localhost:3000,http://localhost:3001,https://erp-software-pied.vercel.app"

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

