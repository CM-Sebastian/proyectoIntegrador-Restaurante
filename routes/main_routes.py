from flask import Blueprint, render_template, abort
from jinja2 import TemplateNotFound
from flask.views import View


mainRoutes = Blueprint('main_pages', __name__,template_folder='templates')


class UserList(View):

    def __init__(self):
        self.main_page = "/"

    def proccess_request(self,request):
        #Aqui va parte de db
        return render_template(self.main_page, objects={})

mainRoutes.add_url_rule("/users/", view_func=UserList.as_view("user_list"))