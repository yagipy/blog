import _config from "../../amdxg.config";
import tagmap from "../../gen/tagmap.json";
import { Layout } from "../../components/Layout";
import { TagList } from "../../components/TagList";
import React from "react";
import {CustomHead} from "../../components/CustomHead";

export const config = { amp: true };

export default () => {
  return (
    <Layout>
      <CustomHead title={"Tags"} description={"タグ一覧"} path={"/tags"}/>
      <TagList tags={Object.keys(tagmap)} />
    </Layout>
  );
};
