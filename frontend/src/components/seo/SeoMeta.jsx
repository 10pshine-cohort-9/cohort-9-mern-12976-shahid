import PropTypes from "prop-types";
import { Helmet } from "react-helmet-async";

const APP_NAME = "Notes App";
const DEFAULT_TITLE = "Capture and organize notes fast";
const DEFAULT_DESCRIPTION =
  "Create, edit, and organize your notes with a fast and secure writing workflow.";

export default function SeoMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  noindex = false,
}) {
  const fullTitle = title ? `${title} | ${APP_NAME}` : `${APP_NAME} | ${DEFAULT_TITLE}`;
  const robots = noindex ? "noindex,nofollow" : "index,follow";

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <meta property="og:site_name" content={APP_NAME} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {canonical ? <link rel="canonical" href={canonical} /> : null}
    </Helmet>
  );
}

SeoMeta.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  canonical: PropTypes.string,
  noindex: PropTypes.bool,
};
