let dbConfig: {
	database: string;
	user: string;
	host: string;
	password: string;
	ssl?: boolean | object;
} = {
	database: process.env.DB_NAME || "postgres",
	user: process.env.DB_USER || "postgres",
	host: process.env.DB_HOST || "localhost",
	password: process.env.DB_PASSWORD || "postgres",
	// ssl: {
	//     rejectUnauthorized: true,
	// },
};

if (process.env.NODE_ENV === "development") {
	dbConfig.database = "tradebot";
	dbConfig.host = "localhost";
	dbConfig.user = "tradebot";
	dbConfig.password = "k8Mn1q9iSLyEDa8geuffweCgWI7hTI5b";
	dbConfig.ssl = false; // Disable SSL in development
}

export default dbConfig;
