const { createHmac, timingSafeEqual } = require("node:crypto");

const cookieName = "imaginia_gallery_admin";
const sessionSeconds = 8 * 60 * 60;

function sign(expires) {
  return createHmac("sha256", process.env.ADMIN_PASSWORD_HASH).update(`${cookieName}:${expires}`).digest("hex");
}

function gallerySessionCookie(active) {
  const expires = Math.floor(Date.now() / 1000) + sessionSeconds;
  const value = active ? `${expires}.${sign(expires)}` : "";
  return `${cookieName}=${value}; Path=/actions; Max-Age=${active ? sessionSeconds : 0}; HttpOnly; Secure; SameSite=Strict`;
}

function hasGallerySession(headers) {
  if (!process.env.ADMIN_PASSWORD_HASH) return false;
  const cookie = (headers?.cookie || "").split(/;\s*/).find((entry) => entry.startsWith(`${cookieName}=`));
  const match = /^(\d{10,12})\.([a-f\d]{64})$/.exec(cookie?.slice(cookieName.length + 1) || "");
  if (!match || Number(match[1]) <= Date.now() / 1000) return false;
  return timingSafeEqual(Buffer.from(match[2], "hex"), Buffer.from(sign(match[1]), "hex"));
}

module.exports = { gallerySessionCookie, hasGallerySession };
