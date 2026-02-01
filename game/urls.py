"""Routes for the Suika game views."""
from django.urls import path

from . import views

app_name = "game"

urlpatterns = [
    path("", views.home, name="home"),
    path("play/", views.index, name="index"),
    path("play", views.index, name="index-noslash"),
    path("result/", views.result, name="result"),
    path("result", views.result, name="result-noslash"),
]
