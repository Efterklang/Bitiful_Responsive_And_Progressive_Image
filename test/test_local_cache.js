const ThumbhashCache = require("../lib/cache");
const fs = require("node:fs");
const path = require("node:path");

async function testLocalCache() {
	console.log("Testing local cache functionality...");

	// 创建临时测试目录
	const testDir = path.join(__dirname, "temp_cache_test");
	const cacheFile = path.join(testDir, "test_cache.json");

	// 清理可能存在的测试文件
	if (fs.existsSync(testDir)) {
		fs.rmSync(testDir, { recursive: true });
	}
	fs.mkdirSync(testDir, { recursive: true });

	try {
		// 测试1: 使用img_src作为缓存键
		console.log("\n=== 测试1: img_src缓存键 ===");
		const cache1 = new ThumbhashCache({
			enable: true,
			cache_file: "test_cache.json",
			hexo_root: testDir,
			cache_key_type: "img_src",
		});

		console.log("✓ Cache instance created (img_src)");

		// 测试加载空缓存
		cache1.loadCacheFromFile();
		console.log("✓ Empty cache loaded");

		// 添加一些测试数据
		cache1.setCachedDataURL(
			"https://example.com/image1.jpg",
			"data:image/png;base64,test1",
		);
		cache1.setCachedDataURL(
			"https://example.com/image2.jpg",
			"data:image/png;base64,test2",
		);

		console.log("✓ Test data added to cache (img_src)");

		// 保存缓存
		await cache1.saveCacheToFile();
		console.log("✓ Cache saved to file (img_src)");

		// 验证文件存在
		if (!fs.existsSync(cacheFile)) {
			throw new Error("Cache file was not created");
		}
		console.log("✓ Cache file exists");

		// 创建新的缓存实例并加载
		const cache2 = new ThumbhashCache({
			enable: true,
			cache_file: "test_cache.json",
			hexo_root: testDir,
			cache_key_type: "img_src",
		});

		cache2.loadCacheFromFile();
		console.log("✓ Cache loaded from file in new instance (img_src)");

		// 验证数据
		const url1 = cache2.getCachedDataURL("https://example.com/image1.jpg");
		const url2 = cache2.getCachedDataURL("https://example.com/image2.jpg");

		if (url1 !== "data:image/png;base64,test1") {
			throw new Error("Data URL 1 mismatch (img_src)");
		}
		if (url2 !== "data:image/png;base64,test2") {
			throw new Error("Data URL 2 mismatch (img_src)");
		}

		console.log("✓ Cached data verified (img_src)");

		// 测试统计信息
		const stats1 = cache2.getStats();
		if (stats1.totalItems !== 2) {
			throw new Error("Stats mismatch (img_src)");
		}

		console.log("✓ Stats verified (img_src)");
		console.log(`Cache contains ${stats1.totalItems} items`);

		// 测试2: 使用img_filename作为缓存键
		console.log("\n=== 测试2: img_filename缓存键 ===");

		// 清理缓存文件
		if (fs.existsSync(cacheFile)) {
			fs.unlinkSync(cacheFile);
		}

		const cache3 = new ThumbhashCache({
			enable: true,
			cache_file: "test_cache.json",
			hexo_root: testDir,
			cache_key_type: "img_filename",
		});

		console.log("✓ Cache instance created (img_filename)");

		// 测试加载空缓存
		cache3.loadCacheFromFile();
		console.log("✓ Empty cache loaded (img_filename)");

		// 添加一些测试数据
		cache3.setCachedDataURL(
			"https://example.com/path/to/image1.jpg",
			"data:image/png;base64,test1",
		);
		cache3.setCachedDataURL(
			"https://another.com/different/path/image2.png",
			"data:image/png;base64,test2",
		);

		console.log("✓ Test data added to cache (img_filename)");

		// 保存缓存
		await cache3.saveCacheToFile();
		console.log("✓ Cache saved to file (img_filename)");

		// 创建新的缓存实例并加载
		const cache4 = new ThumbhashCache({
			enable: true,
			cache_file: "test_cache.json",
			hexo_root: testDir,
			cache_key_type: "img_filename",
		});

		cache4.loadCacheFromFile();
		console.log("✓ Cache loaded from file in new instance (img_filename)");

		// 验证数据 - 应该能通过文件名找到
		const url3 = cache4.getCachedDataURL(
			"https://example.com/path/to/image1.jpg",
		);
		const url4 = cache4.getCachedDataURL(
			"https://another.com/different/path/image2.png",
		);

		// 同样的文件名，不同的路径，应该也能找到
		const url5 = cache4.getCachedDataURL("https://different.com/image1.jpg");
		const url6 = cache4.getCachedDataURL("https://test.com/image2.png");

		if (url3 !== "data:image/png;base64,test1") {
			throw new Error("Data URL 3 mismatch (img_filename)");
		}
		if (url4 !== "data:image/png;base64,test2") {
			throw new Error("Data URL 4 mismatch (img_filename)");
		}
		if (url5 !== "data:image/png;base64,test1") {
			throw new Error(
				"Data URL 5 mismatch (img_filename) - should match by filename",
			);
		}
		if (url6 !== "data:image/png;base64,test2") {
			throw new Error(
				"Data URL 6 mismatch (img_filename) - should match by filename",
			);
		}

		console.log("✓ Cached data verified (img_filename)");
		console.log("✓ Filename-based cache key working correctly");

		// 测试统计信息
		const stats2 = cache4.getStats();
		if (stats2.totalItems !== 2) {
			throw new Error("Stats mismatch (img_filename)");
		}

		console.log("✓ Stats verified (img_filename)");
		console.log(`Cache contains ${stats2.totalItems} items`);

		console.log(
			"\n🎉 All tests passed! Local cache with configurable keys is working correctly.",
		);
	} catch (error) {
		console.error("❌ Test failed:", error.message);
	} finally {
		// 清理测试文件
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true });
		}
		console.log("✓ Test cleanup completed");
	}
}

// 运行测试
testLocalCache();
