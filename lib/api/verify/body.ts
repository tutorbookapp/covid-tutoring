import { APIError } from 'lib/api/error';

interface ModelConstructor<Model, ModelJSON> {
  parse: (json: ModelJSON) => Model;
}

/**
 * Verifies that the given HTTP request body is the JSON form of a certain data
 * model.
 * @param body - The HTTP request body (i.e. the model in JSON form).
 * @param isModelJSON - Custom typeguard that checks if the body is valid JSON.
 * @param Model - Constructor for the model class (`M`).
 * @return A new instance of the model class (`M`) initialized using the given
 * JSON body (i.e. the result of `M.parse(body)`).
 * @example
 * const match = await verifyBody(req.body, isMatchJSON, Match);
 * @example
 * const match = await verifyBody<MatchJSON, Match>(req.body, isMatchJSON, Match);
 */
export default function verifyBody<
  M,
  MJ,
  MC extends ModelConstructor<M, MJ> = ModelConstructor<M, MJ>
>(body: unknown, isModelJSON: (body: unknown) => body is MJ, Model: MC): M {
  if (!isModelJSON(body)) throw new APIError('Invalid request body', 400);
  return Model.parse(body);
}
