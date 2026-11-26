import { app } from "./app";

const PORT = Number(process.env.PORT || 4000);

app.listen(PORT, () => {
  console.log(`EVENTRA Backend API running on http://localhost:${PORT}`);
  console.log(`Execution Mode: ${process.env.EXECUTION_MODE || "LOCAL_DEMO"}`);
});
