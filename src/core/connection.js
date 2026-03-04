import { MongoClient } from "mongodb";

/**
 * MongoDB Connection Manager.
 * Uses the Singleton pattern to ensure only one connection pool is created.
 */
class MongoConnection {
  /**
   * Private static fields to hold the active client and database reference.
   * This ensures state cannot be mutated directly from outside the class.
   */
  static #client = null;
  static #db = null;
  static #uri = null;

  /**
   * Connects to the MongoDB database.
   * If a connection already exists, it reuses it (Singleton Pattern).
   *
   * @param {string} uri - The MongoDB connection string.
   * @param {string} dbName - The name of the database to connect to.
   * @throws {Error} If the URI is missing.
   */
  static async connect(uri, dbName) {
    // 1. Throw error if URI is missing
    if (!uri) {
      throw new Error("MANASDB_CONNECTION_ERROR: MongoDB URI is missing");
    }

    // 2. Reuse existing connection if already connected
    if (this.#client && this.#db) {
      return;
    }

    // 3. Establish a new database connection
    try {
      this.#client = new MongoClient(uri);
      await this.#client.connect();
      this.#db = this.#client.db(dbName);
      this.#uri = uri;
      console.log("ManasDB: Connected to MongoDB");
    } catch (error) {
      console.error("ManasDB: Failed to connect to MongoDB", error);
      throw error;
    }
  }

  /**
   * Validates if the connected MongoDB instance supports Vector Search.
   * Requires MongoDB 6.0.11+ and an Atlas environment.
   */
  static async validateEnvironment() {
    if (!this.#db) {
      throw new Error("MANASDB_CONNECTION_ERROR: Database not connected. Call connect() first.");
    }

    const buildInfo = await this.#db.command({ buildInfo: 1 });
    const version = buildInfo.versionArray; // e.g. [7, 0, 0]

    // Fail-fast on incompatible versions
    if (version[0] < 6 || (version[0] === 6 && version[1] === 0 && version[2] < 11)) {
      throw new Error(`MANASDB_INCOMPATIBLE_VERSION: ManasDB requires MongoDB 6.0.11+ for Vector Search. Current: ${version.join('.')}`);
    }

    // Checking if connection is pointing towards an Atlas cluster
    const isAtlas = this.#uri.includes('.mongodb.net');
    if (!isAtlas) {
      console.warn("️ Local MongoDB detected. Vector Search requires Atlas or Atlas CLI.");
    }
  }

  /**
   * Returns the active database instance.
   *
   * @returns {import('mongodb').Db} The MongoDB database instance.
   * @throws {Error} If the database is not connected yet.
   */
  static getDb() {
    if (!this.#db) {
      throw new Error(
        "MANASDB_CONNECTION_ERROR: Database not connected. Call connect() first.",
      );
    }
    return this.#db;
  }

  /**
   * Disconnects from the MongoDB database and clears references.
   */
  static async disconnect() {
    if (this.#client) {
      await this.#client.close();
      this.#client = null;
      this.#db = null;
    }
  }

  /**
   * Checks if the connection is currently active.
   *
   * @returns {boolean} True if connected, false otherwise.
   */
  static isConnected() {
    return this.#client !== null && this.#db !== null;
  }
}

export default MongoConnection;
