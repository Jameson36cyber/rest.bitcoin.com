"use strict";
/*
  This file controls the request-per-minute (RPM) rate limits.

  It is assumed that this middleware is run AFTER the auth.js middleware which
  checks for Basic auth. If the user adds the correct Basic auth to the header
  of their API request, they will get pro-tier rate limits. By default, the
  freemium rate limits apply.
*/
Object.defineProperty(exports, "__esModule", { value: true });
var RateLimit = require("express-rate-limit");
// Used for debugging.
var util = require("util");
util.inspect.defaultOptions = { depth: 3 };
// Set max requests per minute
var maxRequests = process.env.RATE_LIMIT_MAX_REQUESTS
    ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS)
    : 60;
// Pro-tier rate limits are 10x the freemium limits.
var PRO_RPM = 10 * maxRequests;
// Unique route mapped to its rate limit
var uniqueRateLimits = {};
var routeRateLimit = function (req, res, next) {
    // Disable rate limiting if 0 passed from RATE_LIMIT_MAX_REQUESTS
    if (maxRequests === 0)
        return next();
    // Current route
    var path = req.baseUrl + req.path;
    var route = req.method +
        path
            .split("/")
            .slice(0, 4)
            .join("/");
    // This boolean value is passed from the auth.js middleware.
    var proRateLimits = req.locals.rateLimit;
    // Pro level rate limits
    if (proRateLimits) {
        // Create new RateLimit if none exists for this route
        if (!uniqueRateLimits[route]) {
            uniqueRateLimits[route] = new RateLimit({
                windowMs: 60 * 1000,
                delayMs: 0,
                max: PRO_RPM,
                handler: function (req, res /*next*/) {
                    res.status(429); // https://github.com/Bitcoin-com/rest.bitcoin.com/issues/330
                    return res.json({
                        error: "Too many requests. Limits are " + PRO_RPM + " requests per minute."
                    });
                }
            });
        }
        // Freemium level rate limits
    }
    else {
        // Create new RateLimit if none exists for this route
        if (!uniqueRateLimits[route]) {
            uniqueRateLimits[route] = new RateLimit({
                windowMs: 60 * 1000,
                delayMs: 0,
                max: maxRequests,
                handler: function (req, res /*next*/) {
                    res.status(429); // https://github.com/Bitcoin-com/rest.bitcoin.com/issues/330
                    return res.json({
                        error: "Too many requests. Limits are " + maxRequests + " requests per minute."
                    });
                }
            });
        }
    }
    // Call rate limit for this route
    uniqueRateLimits[route](req, res, next);
};
exports.routeRateLimit = routeRateLimit;
