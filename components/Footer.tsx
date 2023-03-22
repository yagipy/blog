import * as React from "react";
import {FC} from "react";

type Props = {};

export const Footer: FC<Props> = (props) => {
  return (
    <footer className="border-gray-500 border-t mt-3 mb-13 py-2">
      <small className="text-gray-800">© Hiroyuki YAGIHASHI</small>
    </footer>
  );
};
