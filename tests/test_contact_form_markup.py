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

    def test_membership_path_contains_the_required_applicant_and_nominee_fields(self):
        membership = self.parser.by_id("membership-enquiry-fields")
        self.assertIsNotNone(membership)
        self.assertIn("hidden", membership.attrs)

        expected_controls = {
            "membership-dob": "date",
            "membership-plan": None,
            "membership-address": None,
            "nominee-name": "text",
            "nominee-dob": "date",
            "nominee-address": None,
            "nominee-phone": "tel",
            "nominee-email": "email",
            "nominee-relationship": None,
        }
        for control_id, input_type in expected_controls.items():
            control = self.parser.by_id(control_id)
            self.assertIn(control, membership.descendants())
            self.assertIn("disabled", control.attrs)
            self.assertEqual(control.attrs.get("data-required-when-visible"), "true")
            labels = [node for node in self.parser.order if node.tag == "label" and node.attrs.get("for") == control_id]
            self.assertTrue(labels, f"Expected a label for {control_id}")
            self.assertIn("*", labels[0].text())
            if input_type is not None:
                self.assertEqual(control.attrs.get("type"), input_type)

        plan = self.parser.by_id("membership-plan")
        plan_choices = [option.text() for option in plan.descendants("option")]
        self.assertEqual(plan_choices, ["Please select", "Basic", "Standard", "Comprehensive"])

        membership_text = membership.text().lower()
        self.assertIn("within the past 3 months", membership_text)
        self.assertIn("send both documents separately", membership_text)
        self.assertIn("passport copy or driving licence", membership_text)
        self.assertIn("bank statement", membership_text)
        self.assertFalse(any(control.attrs.get("type") == "file" for control in membership.descendants("input")))

    def test_common_and_general_fields_are_required(self):
        for control_id in ("contact-name", "contact-email", "contact-phone"):
            self.assertIn("required", self.parser.by_id(control_id).attrs)
            labels = [node for node in self.parser.order if node.tag == "label" and node.attrs.get("for") == control_id]
            self.assertTrue(labels, f"Expected a label for {control_id}")
            self.assertIn("*", labels[0].text())
        self.assertLess(
            self.parser.order.index(self.parser.by_id("contact-email")),
            self.parser.order.index(self.parser.by_id("contact-phone")),
        )

        general = self.parser.by_id("general-enquiry-fields")
        self.assertIsNotNone(general)
        self.assertIn("hidden", general.attrs)
        for control_id in ("contact-message",):
            control = self.parser.by_id(control_id)
            self.assertIn(control, general.descendants())
            self.assertIn("disabled", control.attrs)
            self.assertIn("data-required-when-visible", control.attrs)
        preferred_method = [node for node in self.parser.order if node.tag == "input" and node.attrs.get("name") == "contactMethod"]
        self.assertEqual(len(preferred_method), 2)
        self.assertTrue(all("data-required-when-visible" in node.attrs for node in preferred_method))
        self.assertIn("*", self.parser.by_id("contact-method-label").text())
        reason = self.parser.by_id("contact-reason")
        self.assertIn("required", reason.attrs)
        reason_label = next(node for node in self.parser.order if node.tag == "label" and node.attrs.get("for") == "contact-reason")
        self.assertIn("*", reason_label.text())

    def test_form_posts_to_site_endpoint_without_email_draft_controls(self):
        form = self.parser.by_id("contact-form")
        self.assertIsNotNone(form)
        self.assertEqual(form.attrs.get("action"), "/api/contact")
        self.assertEqual(form.attrs.get("method", "").lower(), "post")
        self.assertNotIn("mailto:", form.attrs.get("action", "").lower())
        self.assertIsNone(self.parser.by_id("contact-email-draft"))
        self.assertIsNone(self.parser.by_id("contact-email-copy"))
        self.assertIsNotNone(self.parser.by_id("contact-form-status"))
        self.assertIn("send enquiry", form.text().lower())
        self.assertNotIn("open email draft", form.text().lower())


if __name__ == "__main__":
    unittest.main()
