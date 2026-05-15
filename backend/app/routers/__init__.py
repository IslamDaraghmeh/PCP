from app.routers.auth import router as auth_router
from app.routers.images import router as images_router
from app.routers.faces import router as faces_router
from app.routers.persons import router as persons_router
from app.routers.clusters import router as clusters_router
from app.routers.users import router as users_router

__all__ = [
    "auth_router",
    "images_router",
    "faces_router",
    "persons_router",
    "clusters_router",
    "users_router"
]
