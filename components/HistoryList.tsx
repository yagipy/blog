import * as React from "react";
import Link from "next/link";

type History = {
  date: string
  hash: number
  author: string
  message: string
}

type Props = {
  history?: History[]
};

type HistoryProps = {
  history: History
}

const History = ({history}: HistoryProps) => {
  const {date, hash, author, message} = history;

  return (
    <li>
      <Link href={`https://github.com/${author}/####/commit/${hash}`}>
        <a className="text-blue-500">{`${hash} - ${message} by ${author} at ${date}`}</a>
      </Link>
    </li>
  )
}

export const HistoryList = ({history}: Props) => {
  return (
    <details className="my-3 cursor-pointer">
      <summary>History</summary>
      <ul>
        {history.map(_history => <History history={_history}/>)}
      </ul>
    </details>
  );
};
