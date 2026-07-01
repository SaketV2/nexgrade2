module.exports = async function handler(req, res) {
  const origin = req.headers.origin || `https://${req.headers.host}`;
  const redirectUrl = `${origin}/account.html?auth=google`;

  res.writeHead(302, {
    Location: redirectUrl,
  });
  res.end();
};
