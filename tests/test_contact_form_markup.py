from html.parser import HTMLParser
from pathlib import Path
import unittest


VOID_ELEMENTS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


class Node:
    def __init__(self, tag, attrs, parent=None):
        self.tag = tag
        self.attrs = dict(attrs)
        self.parent = parent
        self.children = []
        self.data = []

    def text(self):
        pieces = list(self.data)
        for child in self.children:
            pieces.append(child.text())
        return " ".join(" ".join(pieces).split())

    def descendants(self, tag=None):
        found = []
        for child in self.children:
            if tag is None or child.tag == tag:
                found.append(child)
            found.extend(child.descendants(tag))
        return found


class TreeParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("document", [])
        self.stack = [self.root]
        self.order = []

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(node)
        self.order.append(node)
        if tag not in VOID_ELEMENTS:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID_ELEMENTS:
            self.stack.pop()

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        self.stack[-1].data.append(data)

    def by_id(self, element_id):
        return next(
            (node for node in self.order if node.attrs.get("id") == element_id),
            None,
        )


class ContactFormMarkupTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        html_path = Path(__file__).resolve().parents[1] / "pages" / "contact.html"
        cls.parser = TreeParser()
        cls.parser.feed(html_path.read_text(encoding="utf-8"))

    def test_reason_is_first_and_has_only_the_two_enquiry_choices(self):
        reason = self.parser.by_id("contact-reason")
        name = self.parser.by_id("contact-name")
        self.assertIsNotNone(reason)
        self.assertIsNotNone(name)
        self.assertLess(self.parser.order.index(reason), self.parser.order.index(name))

        choices = [
            (option.attrs.get("value", ""), option.text())
            for option in reason.descendants("option")
        ]
        self.assertEqual(
            choices,
            [
                ("", "Please select"),
                ("membership", "Apply for a membership fund plan"),
                ("general", "General Enquiry"),
            ],
        )

    def test_membership_path_contains_the_required_application_fields(self):
        membership = self.parser.by_id("membership-enquiry-fields")
        self.assertIsNotNone(membership)
        self.assertIn("hidden", membership.attrs)

        expected_controls = {
            "membership-dob": "date",
            "membership-plan": None,
            "membership-address": None,
            "membership-proof-id": "file",
            "membership-proof-address": "file",
        }
        for control_id, input_type in expected_controls.items():
            control = self.parser.by_id(control_id)
            self.assertIn(control, membership.descendants())
            self.assertIn("disabled", control.attrs)
            self.assertEqual(control.attrs.get("data-required-when-visible"), "true")
            if input_type is not None:
                self.assertEqual(control.attrs.get("type"), input_type)

        plan = self.parser.by_id("membership-plan")
        plan_choices = [option.text() for option in plan.descendants("option")]
        self.assertEqual(plan_choices, ["Please select", "Basic", "Standard", "Comprehensive"])

        membership_text = membership.text().lower()
        self.assertIn("within the past 3 months", membership_text)
        self.assertIn("attach both documents manually", membership_text)

    def test_common_and_general_fields_keep_the_existing_enquiry_flow(self):
        self.assertIn("required", self.parser.by_id("contact-name").attrs)
        self.assertIn("required", self.parser.by_id("contact-email").attrs)

        general = self.parser.by_id("general-enquiry-fields")
        self.assertIsNotNone(general)
        self.assertIn("hidden", general.attrs)
        for control_id in ("contact-phone", "contact-message"):
            control = self.parser.by_id(control_id)
            self.assertIn(control, general.descendants())
            self.assertIn("disabled", control.attrs)


if __name__ == "__main__":
    unittest.main()
