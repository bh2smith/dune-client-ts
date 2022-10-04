import {
  ExecutionResponse,
  GetStatusResponse,
  ResultsResponse,
  DuneError,
} from "./responseTypes";
import fetch from "cross-fetch";
import { QueryParameter } from "./queryParameter";
const BASE_URL = "https://api.dune.com/api/v1";

export class DuneClient {
  apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async _handleResponse<T>(responsePromise: Promise<Response>): Promise<T> {
    const apiResponse = await responsePromise
      .then((response) => {
        if (response.status > 400) {
          console.error(`response error ${response.status} - ${response.statusText}`);
        }
        return response.json();
      })
      .catch((error) => {
        console.error(`caught unhandled response error ${JSON.stringify(error)}`);
        throw error;
      });
    if (apiResponse.error) {
      console.error(`caught unhandled response error ${JSON.stringify(apiResponse)}`);
      if (apiResponse.error instanceof Object) {
        throw new DuneError(apiResponse.error.type);
      } else {
        throw new DuneError(apiResponse.error);
      }
    }
    return apiResponse;
  }

  private async _get<T>(url: string): Promise<T> {
    console.debug(`GET received input url=${url}`);
    const response = fetch(url, {
      method: "GET",
      headers: {
        "x-dune-api-key": this.apiKey,
      },
    });
    return this._handleResponse<T>(response);
  }

  private async _post<T>(url: string, params?: QueryParameter[]): Promise<T> {
    console.debug(`POST received input url=${url}, params=${JSON.stringify(params)}`);
    const reducedParams = params?.reduce<Record<string, string>>(
      (acc, { name, value }) => ({ ...acc, [name]: value }),
      {},
    );
    const response = fetch(url, {
      method: "POST",
      body: JSON.stringify({ query_parameters: reducedParams || {} }),
      headers: {
        "x-dune-api-key": this.apiKey,
      },
    });
    return this._handleResponse<T>(response);
  }

  async execute(
    queryID: number,
    parameters?: QueryParameter[],
  ): Promise<ExecutionResponse> {
    const response = await this._post<ExecutionResponse>(
      `${BASE_URL}/query/${queryID}/execute`,
      parameters,
    );
    console.debug(`execute response ${JSON.stringify(response)}`);
    return {
      execution_id: response.execution_id,
      state: response.state,
    };
  }

  async get_status(jobID: string): Promise<GetStatusResponse> {
    const response: GetStatusResponse = await this._get(
      `${BASE_URL}/execution/${jobID}/status`,
    );
    console.debug(`get_status response ${JSON.stringify(response)}`);
    const { execution_id, query_id, state } = response;
    return {
      execution_id,
      query_id,
      state,
      // times: parseTimesFrom(data)
    };
  }

  async get_result(jobID: string): Promise<ResultsResponse> {
    const response: ResultsResponse = await this._get(
      `${BASE_URL}/execution/${jobID}/results`,
    );
    console.debug(`get_result response ${JSON.stringify(response)}`);
    return response as ResultsResponse;
    // return {
    //   execution_id: data.execution_id,
    //   query_id: data.query_id,
    //   state: data.state,
    //   // times: parseTimesFrom(data)
    //   result: data.result
    //     ? { rows: data.result.rows, metadata: data.result.metadata }
    //     : undefined,
    // };
  }

  async cancel_execution(jobID: string): Promise<boolean> {
    const { success }: { success: boolean } = await this._post(
      `${BASE_URL}/execution/${jobID}/cancel`,
    );
    return success;
  }
}
