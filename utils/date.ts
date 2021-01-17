export const toDate = (string) => (
  string.substr(0, 4) + '/' + string.substr(4, 2) + '/' + string.substr(6, 2)
);
