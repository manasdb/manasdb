/**
 * MongoDB Connection Manager.
 * Uses the Singleton pattern to ensure only one connection pool is created.
 */
export class MongoConnection {
  private static client: any = null;
  private static db: any = null;
  private static uri: string | null = null;

  /**
   * Connects to the MongoDB database.
   * If a connection already exists, it reuses it (Singleton Pattern).
   */
  static async connect(uri: string, dbName?: string): Promise<void> {
    if (!uri) {
      throw new Error("MANASDB_CONNECTION_ERROR: MongoDB URI is missing");
    }

    if (this.client && this.db) {
      return;
    }

    try {
      const { MongoClient } = await import("mongodb");
      this.client = new MongoClient(uri);
      await this.client.connect();
      this.db = this.client.db(dbName);
      this.uri = uri;
      console.log("ManasDB: Connected to MongoDB");
    } catch (error) {
      console.error("ManasDB: Failed to connect to MongoDB", error);
      throw error;
    }
  }

  /**
   * Validates if the connected MongoDB instance supports Vector Search.
   */
  static async validateEnvironment(): Promise<void> {
    if (!this.db) {
      throw new Error("MANASDB_CONNECTION_ERROR: Database not connected. Call connect() first.");
    }

    const buildInfo = await this.db.command({ buildInfo: 1 });
    const version = buildInfo.versionArray;

    if (version[0] < 6 || (version[0] === 6 && version[1] === 0 && version[2] < 11)) {
      throw new Error(`MANASDB_INCOMPATIBLE_VERSION: ManasDB requires MongoDB 6.0.11+ for Vector Search. Current: ${version.join('.')}`);
    }

    const isAtlas = this.uri ? this.uri.includes('.mongodb.net') : false;
    if (!isAtlas) {
      console.warn("️ Local MongoDB detected. Vector Search requires Atlas or Atlas CLI.");
    }
  }

  /**
   * Returns the active database instance.
   */
  static getDb(): any {
    if (!this.db) {
      throw new Error(
        "MANASDB_CONNECTION_ERROR: Database not connected. Call connect() first.",
      );
    }
    return this.db;
  }

  /**
   * Disconnects from the MongoDB database and clears references.
   */
  static async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  /**
   * Checks if the connection is currently active.
   */
  static isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }
}

export default MongoConnection;
