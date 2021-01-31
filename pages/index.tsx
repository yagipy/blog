import pages from "../gen/pages.json";
import _config from "../amdxg.config";
import tagmap from "../gen/tagmap.json";
import { Layout } from "../components/Layout";
import React from "react";
import {PageList} from "../components/PageList";
import {TagList} from "../components/TagList";
import {Profile} from "../components/Profile";
import { CustomHead } from "../components/CustomHead";

export const config = { amp: true };

export default () => {
  return (
    <Layout>
      <CustomHead title={_config.siteName} description={_config.description} path={'/'}/>
      <Profile />
      <PageList pages={pages} />
      <TagList tags={Object.keys(tagmap)} />
    </Layout>
  );
};
