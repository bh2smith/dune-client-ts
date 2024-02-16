// Assuming the existence of these imports based on your Python code
import { Router } from "./router";
import { DuneQuery, QueryParameter, CreateQueryResponse, DuneError } from "../types";
import { CreateQueryPayload, UpdateQueryPayload } from "../types/requestPayload";

interface EditQueryResponse {
  query_id: number;
}
export class QueryAPI extends Router {
  /**
   * Creates a Dune Query by ID
   * https://dune.com/docs/api/api-reference/edit-queries/create-query/
   */
  async createQuery(
    name: string,
    querySql: string,
    params?: QueryParameter[],
    isPrivate: boolean = false,
  ): Promise<DuneQuery> {
    const payload: CreateQueryPayload = {
      name,
      query_sql: querySql,
      is_private: isPrivate,
      query_parameters: params ? params : [],
    };
    const responseJson = await this._post<CreateQueryResponse>("query/", payload);
    return this.getQuery(responseJson.query_id);
  }

  /**
   * Retrieves a Dune Query by ID
   * https://dune.com/docs/api/api-reference/edit-queries/get-query/
   */
  async getQuery(queryId: number): Promise<DuneQuery> {
    const responseJson = await this._get(`query/${queryId}`);
    return responseJson as DuneQuery;
  }

  /**
   * Updates a Dune Query by ID
   * https://dune.com/docs/api/api-reference/edit-queries/update-query/
   */
  async updateQuery(
    queryId: number,
    name?: string,
    querySql?: string,
    params?: QueryParameter[],
    description?: string,
    tags?: string[],
  ): Promise<number> {
    const parameters: UpdateQueryPayload = {};
    if (name !== undefined) parameters.name = name;
    if (description !== undefined) parameters.description = description;
    if (tags !== undefined) parameters.tags = tags;
    if (querySql !== undefined) parameters.query_sql = querySql;
    if (params !== undefined) parameters.query_parameters = params;

    if (Object.keys(parameters).length === 0) {
      console.warn("Called updateQuery with no proposed changes.");
      return queryId;
    }

    try {
      const responseJson = await this._patch<CreateQueryResponse>(
        `query/${queryId}`,
        parameters,
      );
      return responseJson.query_id;
    } catch (err: unknown) {
      throw new Error(`Fokin Broken: ${err}`);
      // throw new DuneError(responseJson, "UpdateQueryResponse", err);
    }
  }

  public async archiveQuery(queryId: number): Promise<boolean> {
    const response = await this._post<EditQueryResponse>(`/query/${queryId}/archive`);
    const query = await this.getQuery(response.query_id);
    return query.is_archived;
  }

  public async unarchiveQuery(queryId: number): Promise<boolean> {
    const response = await this._post<EditQueryResponse>(`/query/${queryId}/unarchive`);
    const query = await this.getQuery(response.query_id);
    return query.is_archived;
  }

  public async makePrivate(queryId: number): Promise<void> {
    const response = await this._post<EditQueryResponse>(`/query/${queryId}/private`);
    const query = await this.getQuery(response.query_id);
    if (!query.is_private) {
      throw new DuneError("Query was not made private!");
    }
  }

  public async makePublic(queryId: number): Promise<void> {
    const responseJson = await this._post<EditQueryResponse>(
      `/query/${queryId}/unprivate`,
    );
    const query = await this.getQuery(responseJson.query_id);
    if (query.is_private) {
      throw new DuneError("Query is still private.");
    }
  }
}
