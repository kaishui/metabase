import {
  restore,
  visitQuestionAdhoc,
  downloadAndAssert,
} from "__support__/e2e/cypress";
import { SAMPLE_DATASET } from "__support__/e2e/cypress_sample_dataset";

const { REVIEWS, REVIEWS_ID, PRODUCTS, PRODUCTS_ID } = SAMPLE_DATASET;

/**
 * This question might seem a bit overwhelming at the first sight.
 * The whole point of this repro was to try to cover as much of the old syntax as possible.
 * We want to make sure it still works when loaded into a new(er) Metabase version.
 */

const questionDetails = {
  dataset_query: {
    database: 1,
    type: "query",
    query: {
      "source-table": REVIEWS_ID,
      joins: [
        {
          fields: [["joined-field", "Products", ["field-id", PRODUCTS.TITLE]]],
          "source-table": PRODUCTS_ID,
          condition: [
            "=",
            ["field-id", REVIEWS.PRODUCT_ID],
            ["joined-field", "Products", ["field-id", PRODUCTS.ID]],
          ],
          alias: "Products",
        },
      ],
      filter: ["and", ["=", ["field-id", REVIEWS.RATING], 4]],
      "order-by": [
        ["asc", ["joined-field", "Products", ["field-id", PRODUCTS.TITLE]]],
      ],
      fields: [["field-id", REVIEWS.ID], ["field-id", REVIEWS.REVIEWER]],
      limit: 5,
    },
  },
  display: "table",
  visualization_settings: {
    // Rename columns
    column_settings: {
      [`["ref",["field",${REVIEWS.ID},null]]`]: {
        column_title: "MOD:ID",
      },
      [`["ref",["field",${REVIEWS.REVIEWER},null]]`]: {
        column_title: "MOD:Reviewer",
      },
      [`["ref",["field",${PRODUCTS.TITLE},null]]`]: {
        column_title: "MOD:Title",
      },
    },
    // Reorder columns
    "table.columns": [
      {
        name: "TITLE",
        fieldRef: ["joined-field", "Products", ["field-id", PRODUCTS.TITLE]],
        enabled: true,
      },
      {
        name: "ID",
        fieldRef: ["field-id", REVIEWS.ID],
        enabled: true,
      },
      {
        name: "REVIEWER",
        fieldRef: ["field-id", REVIEWS.REVIEWER],
        enabled: true,
      },
    ],
  },
};

const testCases = ["csv", "xlsx"];

testCases.forEach(type => {
  describe("issue 18382", () => {
    beforeEach(() => {
      // TODO: Please remove this line when issue gets fixed
      cy.skipOn(type === "csv");

      cy.intercept("POST", "/api/dataset").as("dataset");

      restore();
      cy.signInAsAdmin();

      visitQuestionAdhoc(questionDetails);
      cy.wait("@dataset");
    });

    it(`should handle the old syntax in downloads for ${type} (metabase#18382)`, () => {
      downloadAndAssert(type, assertion);
    });
  });
});

function assertion(sheet) {
  expect(sheet["A1"].v).to.eq("MOD:Title");
  expect(sheet["B1"].v).to.eq("MOD:ID");
  expect(sheet["C1"].v).to.eq("MOD:Reviewer");

  expect(sheet["A2"].v).to.eq("Aerodynamic Concrete Bench");
}
