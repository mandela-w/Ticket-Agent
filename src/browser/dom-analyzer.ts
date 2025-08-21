import { Page } from "playwright";

export class DOMAnalyzer {
  async analyzePage(page: Page): Promise<any> {
    const structure = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll("form")).map(
        (form) => {
          const inputs = Array.from(
            form.querySelectorAll("input, textarea, select")
          ).map((el) => ({
            tag: el.tagName.toLowerCase(),
            type: el.getAttribute("type"),
            name: el.getAttribute("name"),
            id: el.id,
            placeholder: el.getAttribute("placeholder"),
            required: el.hasAttribute("required"),
            label: this.findLabel(el),
          }));

          const buttons = Array.from(
            form.querySelectorAll('button, input[type="submit"]')
          ).map((btn) => ({
            tag: btn.tagName.toLowerCase(),
            type: btn.getAttribute("type"),
            text: btn.textContent?.trim(),
            id: btn.id,
          }));

          return { inputs, buttons };
        }
      );

      // Also find forms that might not be in <form> tags
      const standaloneInputs = Array.from(
        document.querySelectorAll("input, textarea, select")
      )
        .filter((el) => !el.closest("form"))
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute("type"),
          name: el.getAttribute("name"),
          id: el.id,
          placeholder: el.getAttribute("placeholder"),
        }));

      return {
        forms,
        standaloneInputs,
        url: window.location.href,
        title: document.title,
      };
    });

    return structure;
  }

  private findLabel(element: Element): string | null {
    // Try to find associated label
    const id = element.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) return label.textContent?.trim() || null;
    }

    // Check if element is wrapped in label
    const parentLabel = element.closest("label");
    if (parentLabel) {
      return parentLabel.textContent?.trim() || null;
    }

    return null;
  }
}
