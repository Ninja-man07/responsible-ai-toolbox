# Copyright (c) Microsoft Corporation
# Licensed under the MIT License.

"""Defines the dashboard class."""

from rai_core_flask import FlaskHelper  # , environment_detector
from IPython.display import display, HTML
import json
import os
from html.parser import HTMLParser
import uuid
from .explanation_constants import ExplanationDashboardInterface


class InLineScript(HTMLParser):
    def __init__(self, load_widget_file):
        HTMLParser.__init__(self)
        self.content = ""
        self.load_widget_file = load_widget_file

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            src = None
            for att in attrs:
                if att[0] == "src":
                    src = att[1]
                    break
            if src is not None:
                content = self.load_widget_file(src)
                self.content += f'<script>\r\n{content}\r\n'
                return
        self.content += self.get_starttag_text()

    def handle_endtag(self, tag):
        self.content += f'</{tag}>'
        pass

    def handle_data(self, data):
        self.content += data
        pass


class Dashboard(object):
    """The dashboard class, wraps the dashboard component.

    :param sensitive_features: A matrix of feature vector examples
        (# examples x # features), these can be from the initial dataset,
        or reserved from training.
    :type sensitive_features: numpy.array or list[][] or pandas.DataFrame
        or pandas.Series
    :param y_true: The true labels or values for the provided dataset.
    :type y_true: numpy.array or list[]
    :param y_pred: Array of output predictions from models to be evaluated.
        Can be a single array of predictions, or a 2D list over multiple
        models. Can be a dictionary of named model predictions.
    :type y_pred: numpy.array or list[][] or list[] or dict {string: list[]}
    :param sensitive_feature_names: Feature names
    :type sensitive_feature_names: numpy.array or list[]
    """

    def __init__(
            self, *,
            dashboard_type,
            model_data,
            public_ip=None,
            port=None,
            add_local_url=False):
        """Initialize the Dashboard."""

        if model_data is None or type is None:
            raise ValueError("Required parameters not provided")

        try:
            self._service = FlaskHelper(ip=public_ip, port=port)
        except Exception as e:
            self._service = None
            raise e

        self.id = uuid.uuid4().hex

        self.config = {
            "dashboardType": dashboard_type,
            "id": self.id,
            "baseUrl": self._service.env.base_url,
            'withCredentials': False
        }
        if add_local_url:
            local_url = ExplanationDashboardInterface.LOCAL_URL
            model_data[local_url] = self._service.env.base_url
        self.model_data = model_data
        self.add_route()

        html = self.load_index()
        print(f'{dashboard_type} started at {self._service.env.base_url}')
        display(HTML(html), metadata=dict(isolated=True))

    def add_route(self):
        # To enable multiple dashboards to run in the same notebook we need to
        # prevent them from using the same method names (in addition to using
        # dedicated ports). Below we rename the function for that purpose and
        # manually add the URL rule instead of using the route decorator.
        def visual():
            return self.load_index()
        self.add_url_rule(visual, '/', methods=["GET"])
        return

    def get_widget_path(path):
        script_path = os.path.dirname(os.path.abspath(__file__))
        return os.path.join(script_path, "widget", path)

    def load_index(self):
        index = self.load_widget_file("index.html")
        parser = InLineScript(self.load_widget_file)
        parser.feed(index)
        return parser.content

    def load_widget_file(self, path):
        js_path = Dashboard.get_widget_path(path)
        with open(js_path, "r", encoding="utf-8") as f:
            content = f.read()
            content = content.replace(
                "__rai_app_id__", f'rai_widget_{self.id}')
            content = content.replace(
                "__rai_config__", json.dumps(self.config))
            content = content.replace(
                "__rai_model_data__", json.dumps(self.model_data))
            return content

    def add_url_rule(self, func, route, methods):
        """To enable multiple dashboards to run in the same notebook we need to
        prevent them from using the same method names (in addition to using
        dedicated ports). We rename the function for that purpose and
        manually add the URL rule instead of using the route decorator.
        """
        func.__name__ = func.__name__ + str(id(self))
        self._service.app.add_url_rule(
            route,
            endpoint=func.__name__,
            view_func=func,
            methods=methods)