import { json, requireConnectorAuth, resolveMyShop, etsyFetch, safeError } from './_etsy.mjs';

export default async (request) => {
  if (!requireConnectorAuth(request)) return json({ error: 'Unauthorized' }, 401);
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405);

  try {
    const body = await request.json();
    const listingId = Number(body.listing_id);
    const questions = Array.isArray(body.personalization_questions) ? body.personalization_questions : null;

    if (!listingId) return json({ error: 'listing_id is required.' }, 400);
    if (!questions || questions.length < 1 || questions.length > 5) {
      return json({ error: 'personalization_questions must contain between 1 and 5 questions.' }, 400);
    }

    const normalized = questions.map((q) => {
      const type = String(q.question_type || 'text_input');
      const questionText = String(q.question_text || '').trim();
      const instructions = String(q.instructions || '').trim();
      if (!questionText) throw new Error('Each personalization question requires question_text.');
      if (instructions.length > 120) throw new Error('Personalization instructions must be 120 characters or fewer.');

      const result = {
        question_type: type,
        question_text: questionText,
        instructions,
        required: Boolean(q.required),
      };

      if (q.question_id) result.question_id = Number(q.question_id);

      if (type === 'text_input') {
        const maxChars = Number(q.max_allowed_characters || 50);
        if (maxChars < 1 || maxChars > 1024) throw new Error('max_allowed_characters must be between 1 and 1024.');
        result.max_allowed_characters = maxChars;
      }

      if (type === 'dropdown') {
        const options = Array.isArray(q.options) ? q.options : [];
        if (!options.length) throw new Error('Dropdown personalization questions require options.');
        result.options = options.map((o) => ({
          ...(o.option_id ? { option_id: Number(o.option_id) } : {}),
          label: String(o.label || '').trim(),
        })).filter((o) => o.label);
      }

      return result;
    });

    const { shop } = await resolveMyShop();
    const result = await etsyFetch(
      `/shops/${shop.shop_id}/listings/${listingId}/personalization?supports_multiple_personalization_questions=true`,
      {
        method: 'POST',
        body: { personalization_questions: normalized },
      },
    );

    return json(result);
  } catch (error) {
    return json(safeError(error), error.status || 500);
  }
};
