import { test, expect } from "@playwright/test";

test.describe("ページ表示", () => {
  test("タイトルと全7種のAPIカードが表示される", async ({ page }) => {
    await page.goto("/");

    // ページタイトル確認
    await expect(page).toHaveTitle(/StorageBench|オフラインデータ/);

    // 全APIカードが存在する
    const apiNames = [
      "localStorage",
      "sessionStorage",
      "IndexedDB",
      "Cache API",
      "OPFS",
      "SQLite/Wasm",
      "PGLite",
    ];
    for (const name of apiNames) {
      await expect(page.getByText(name).first()).toBeVisible();
    }
  });

  test("「全テスト実行」ボタンが存在する", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /全テスト実行/ })
    ).toBeVisible();
  });
});

test.describe("データ種別セレクター", () => {
  test("4種別のボタンが表示されアクティブ切り替えができる", async ({ page }) => {
    await page.goto("/");

    const labels = ["ランダムバイナリ", "画像 (BMP)", "テキスト", "JSON"];
    for (const label of labels) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }

    // 画像 (BMP) に切り替え
    await page.getByRole("button", { name: "画像 (BMP)" }).click();
    await expect(
      page.getByRole("button", { name: "画像 (BMP)" })
    ).toHaveAttribute("aria-pressed", "true");

    // ランダムバイナリに戻す
    await page.getByRole("button", { name: "ランダムバイナリ" }).click();
    await expect(
      page.getByRole("button", { name: "ランダムバイナリ" })
    ).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("localStorage ベンチマーク（単体）", () => {
  test("個別実行ボタンをクリックすると計測が完了し結果が表示される", async ({ page }) => {
    await page.goto("/");

    // localStorageカードの「個別実行」ボタンを探す
    const card = page.locator(".rounded.border").filter({ hasText: "localStorage" }).first();
    const runBtn = card.getByRole("button", { name: /個別実行/ });

    await runBtn.click();

    // 「計測中…」表示を確認
    await expect(card.getByText("計測中…")).toBeVisible({ timeout: 3_000 });

    // 完了まで待機（localStorage は最大数秒）
    await expect(card.getByText("実測上限")).toBeVisible({ timeout: 30_000 });
    await expect(card.getByText("スループット")).toBeVisible();
  });
});

test.describe("エラー表示", () => {
  test("クォータ不足時にエラーメッセージが赤背景で表示される（モック）", async ({ page }) => {
    await page.goto("/");

    // localStorage.setItem を常にエラーにするよう上書き
    await page.addInitScript(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string) {
        if (key.startsWith("__bench_")) {
          throw new DOMException("QuotaExceededError", "QuotaExceededError");
        }
        return original.apply(this, arguments as unknown as [string, string]);
      };
    });

    await page.reload();

    const card = page.locator(".rounded.border").filter({ hasText: "localStorage" }).first();
    await card.getByRole("button", { name: /個別実行/ }).click();

    // エラー表示を確認（赤背景クラス bg-danger/10）
    await expect(card.locator(".bg-danger\\/10")).toBeVisible({ timeout: 15_000 });
  });
});
