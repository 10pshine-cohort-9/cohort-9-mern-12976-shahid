import PropTypes from "prop-types";

export const noteShape = PropTypes.shape({
  _id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  userId: PropTypes.string,
  createdAt: PropTypes.string,
  updatedAt: PropTypes.string,
});
