// Check deployed Vercel site for YOUR_WORKFLOW_ID text
const res = await fetch('https://stock-observability-ui.vercel.app/');
const html = await res.text();
const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
if (match) {
  console.log('JS bundle path:', match[1]);
  const jsRes = await fetch('https://stock-observability-ui.vercel.app' + match[1]);
  const js = await jsRes.text();
  const hasOld = js.includes('YOUR_WORKFLOW_ID');
  const hasNew = js.includes('activeWorkflowId');
  console.log('Contains YOUR_WORKFLOW_ID:', hasOld);
  console.log('Contains activeWorkflowId:', hasNew);
} else {
  console.log('Could not find JS bundle in HTML');
  console.log(html.substring(0, 500));
}
