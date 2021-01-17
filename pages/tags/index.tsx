import Head from "next/head";
// import { TagList } from "amdxg-components";
import _config from "../../amdxg.config";
import tagmap from "../../gen/tagmap.json";
import { Layout } from "../../components/Layout";
import { TagList } from "../../components/TagList";
import React from "react";

export const config = { amp: true };

export default () => {
  return (
    <Layout>
      {/*<Head>*/}
      {/*  <title>Tags - {_config.siteName}</title>*/}
      {/*</Head>*/}
      <TagList tags={Object.keys(tagmap)} />
    </Layout>
  );
};
