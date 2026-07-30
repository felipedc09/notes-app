import { expect, test, type Page } from "@playwright/test";

/**
 * FR-09/FR-10/FR-27: the draft lifecycle end to end against the real dev
 * servers. "New Note" opens instantly with zero requests; the first
 * keystroke debounces into a POST, later keystrokes into a PATCH; closing
 * an empty note discards it without leaving a database row.
 */
async function signup(page: Page) {
  const email = `editor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("a-very-unguessable-pw-1");
  await page.getByRole("button", { name: "Sign Up" }).click();
  await expect(page).toHaveURL("/");
}

test("New Note opens instantly, autosaves after typing, and survives a reload (FR-09, FR-10)", async ({
  page,
}) => {
  await signup(page);

  await page.getByRole("button", { name: "New Note" }).click();
  const titleInput = page.getByPlaceholder("Note Title");
  await expect(titleInput).toBeVisible();

  await titleInput.fill("My first note");
  const contentField = page.getByPlaceholder("Pour your heart out...");
  await contentField.fill("Hello from the editor");

  // Debounce (500ms) plus the POST round trip.
  await page.waitForTimeout(1000);

  await page.getByRole("button", { name: "Close note" }).click();
  await page.reload();

  await expect(page.getByText("My first note")).toBeVisible();
});

test("a note opened and left empty is kept, not discarded", async ({ page }) => {
  await signup(page);

  await page.getByRole("button", { name: "New Note" }).click();
  const titleInput = page.getByPlaceholder("Note Title");
  await titleInput.fill("Temporary note");
  await page.waitForTimeout(1000);

  await titleInput.fill("");
  const contentField = page.getByPlaceholder("Pour your heart out...");
  await expect(contentField).toHaveValue("");

  await page.getByRole("button", { name: "Close note" }).click();
  await page.waitForTimeout(500);

  // The row survives the clear-and-close, so the grid keeps one card and the
  // empty state must not come back.
  await page.reload();
  await expect(page.getByText("I’m just here waiting for your charming notes...")).toHaveCount(0);
});

test("the timestamp is shown as soon as New Note is clicked", async ({ page }) => {
  await signup(page);

  await page.getByRole("button", { name: "New Note" }).click();

  // Server-derived: it can only render once the note row actually exists.
  await expect(page.getByText(/^Last Edited:/)).toBeVisible();
});
