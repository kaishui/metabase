import React from "react";
import { t } from "ttag";
import PropTypes from "prop-types";
import { getIn } from "icepick";
import cx from "classnames";

import Table from "metabase/visualizations/visualizations/Table";
import { formatColumn, formatValue } from "metabase/lib/formatting";
import { CardApi } from "metabase/services";
import Button from "metabase/components/Button";
import Link from "metabase/components/Link";
import Question from "metabase-lib/lib/Question";
import { QuestionResultLoader } from "metabase/containers/QuestionResultLoader";
import { columnNameToUrl } from "../../audit_app/lib/util";

const CARD_ID_ROW_IDX = 0;
const ErrorDrill = ({ clicked }) => {
  if (!clicked) {
    return [];
  }

  const cardId = clicked.origin.row[CARD_ID_ROW_IDX];

  return [
    {
      name: "detail",
      title: `View this`,
      default: true,
      url() {
        return `/admin/tools/errors/${cardId}`;
      },
    },
  ];
};

export const ErrorMode = {
  name: "error",
  drills: () => [ErrorDrill],
};

function ErrorDetailDisplay(props) {
  const { result } = props;
  const resRow = getIn(result, ["data", "rows", 0]);
  const resCols = getIn(result, ["data", "cols"]);
  if (resRow && resCols) {
    const nameToResCol = resCols.reduce(
      (obj, x, idx) => Object.assign(obj, { [x.name]: idx }),
      {},
    );

    const linkColumns = [
      null,
      "collection_id",
      "database_id",
      null,
      "table_id",
      null,
      "user_id",
      null
    ];

    const ordinaryRows = [
      "last_run_at",
      "collection_name",
      "database_name",
      "schema_name",
      "table_name",
      "total_runs",
      "user_name",
      "updated_at",
    ].map((x, idx) => {
      const idVal = resRow[nameToResCol[linkColumns[idx]]];
      const urlVal = linkColumns[idx] && idVal ? columnNameToUrl[linkColumns[idx]](idVal) : "";
      const linkClass = (urlVal === "") ? "" : "text-brand";
      const formattedVal = formatValue(resRow[nameToResCol[x]], {
        column: resCols[nameToResCol[x]],
        jsx: true,
        rich: true,
        type: "cell",
        local: true,
      });
      return (<tr key={x}>
        <td align="right" className="m0 mt1 text-medium">
          {formatColumn(resCols[nameToResCol[x]])}
        </td>
        <td>
        {<Link to={urlVal} className={linkClass}>
          {formattedVal}
          </Link>}
        </td>
      </tr>)
    });
    const dashIdRows = resRow[nameToResCol.dash_name_str]
      .split("|")
      .map((x, idx) => (
        <tr key={x}>
          <td align="right" className="m0 mt1 text-medium">
            {idx === 0 && formatColumn(resCols[nameToResCol.dash_name_str])}
          </td>
          <td className="text-bold">
            {formatValue(x, { column: resCols[nameToResCol.dash_name_str] })}
          </td>
        </tr>
      ));

    return [
      <h2 className="PageTitle p1" key="card_name">
        {resRow[nameToResCol.card_name]}
      </h2>,
      <div key="error_str" className="p1 text-code">
        {resRow[nameToResCol.error_str]}
      </div>,
      <table key="table" className="ContentTable">
      <tbody>
        {[ordinaryRows, dashIdRows]}
      </tbody>
      </table>,
    ];
  } else {
    return null;
  }
}

export default function ErrorDetail(props) {
  const { params } = props;
  const cardId = parseInt(params.cardId);

  const errorRetry = async cardId => {
    await CardApi.query({ cardId: cardId });
    // we're imagining that we successfully reran, in which case we want to go back to overall table
    window.location = "/admin/tools/errors/";
  };

  // below card is not the card in question, but
  // the card we're creating to query for the error details
  const card = {
    name: "Card Errors",
    dataset_query: {
      type: "internal",
      fn: "metabase-enterprise.audit-app.pages.query-detail/bad-card",
      args: [cardId],
    },
  };
  const question = new Question(card, null);

  return (
    <div>
      <QuestionResultLoader question={question}>
        {({ rawSeries, result }) => <ErrorDetailDisplay result={result} />}
      </QuestionResultLoader>
      <Button className="float-right" onClick={() => errorRetry(cardId)}>
        {t`Rerun Question`}
      </Button>
    </div>
  );
}

ErrorDetail.propTypes = {
  params: PropTypes.object,
};
ErrorDetailDisplay.propTypes = {
  result: PropTypes.object,
};