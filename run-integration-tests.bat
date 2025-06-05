@echo off
echo Running MongoDB and Redis integration tests...

echo.
echo === MongoDB API Tests ===
call npm test -- server/tests/mongoRoutes.test.ts

echo.
echo === Redis Pub/Sub Tests ===
call npm test -- server/tests/redisPubSub.test.ts

echo.
echo === Redis Session Tests ===
call npm test -- server/tests/redisSession.test.ts

echo.
echo === Asset Cache Tests ===
call npm test -- server/tests/assetCacheService.test.ts

echo.
echo All tests completed!
