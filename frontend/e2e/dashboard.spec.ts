import { expect, test } from "@playwright/test";

/**
 * FR-08/FR-18/FR-19/Q2: signup lands on the dashboard's unfiltered "All
 * Categories" view, and selecting a category filters the note grid.
 * Slice 4 is read-only display — there is no note creation UI yet, so the
 * filter assertion relies on the seeded categories' zero-note empty state
 * rather than authored note fixtures.
 */
test("signup lands on the dashboard in the All Categories state", async ({ page }) => {
  const email = `dashboard-${Date.now()}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("a-very-unguessable-pw-1");
  await page.getByRole("button", { name: "Sign Up" }).click();

  await expect(page).toHaveURL("/");
  const allCategories = page.getByRole("button", { name: "All Categories" });
  await expect(allCategories).toBeVisible();
  await expect(allCategories).toHaveAttribute("aria-current", "true");

  // FR-07 seeding: the three fixed categories appear in the sidebar.
  await expect(page.getByRole("button", { name: /Random Thoughts/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^School/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Personal/ })).toBeVisible();

  // FR-08: a brand-new user has zero notes.
  await expect(page.getByText("I’m just here waiting for your charming notes...")).toBeVisible();
});

test("category filter switches the active sidebar item and updates the URL (FR-19)", async ({
  page,
}) => {
  const email = `filter-${Date.now()}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("a-very-unguessable-pw-1");
  await page.getByRole("button", { name: "Sign Up" }).click();
  await expect(page).toHaveURL("/");

  const schoolItem = page.getByRole("button", { name: /^School/ });
  await schoolItem.click();

  await expect(page).toHaveURL(/\?category=\d+/);
  await expect(schoolItem).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("button", { name: "All Categories" })).not.toHaveAttribute(
    "aria-current",
    "true",
  );

  await page.getByRole("button", { name: "All Categories" }).click();
  await expect(page).toHaveURL("/");
});
