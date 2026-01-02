const replaceImages = require("../lib/replace.js");
const fs = require("node:fs");
const path = require("node:path");

// set env var, CI=true
process.env.CI = "true";

// 测试配置
const config = {
	srcset_widths: [400, 800, 1200], // 简化的宽度数组
	add_max_width: true,
	max_widths: "(max-width: 768px) 100vw, 50vw",
};

console.log("=== 测试懒加载功能 ===\n");
console.log("配置信息：");
console.log("\n处理结果：\n");

async function runTest() {
	// 读取测试 HTML 文件
	const testHtml = fs.readFileSync(
		path.join(__dirname, "test_page.html"),
		"utf8",
	);

	// 处理图片
	const result = await replaceImages(testHtml, config);

	// 确保输出目录存在
	const outputDir = path.join(__dirname, "output");
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	// 写入输出文件
	const outputPath = path.join(outputDir, "index.html");
	fs.writeFileSync(outputPath, result);

	console.log(`生成的 HTML 已保存到: ${outputPath}`);
}

runTest().catch(console.error);
