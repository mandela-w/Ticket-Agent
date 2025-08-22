export const mockForms = {
  simple: `
    <form>
      <input type="email" name="email" />
      <input type="text" name="subject" />
      <textarea name="message"></textarea>
      <button type="submit">Submit</button>
    </form>
  `,
  complex: `
    <form>
      <div class="form-group">
        <label for="contact-email">Email</label>
        <input id="contact-email" type="email" required />
      </div>
      <select name="category">
        <option>Technical</option>
        <option>Billing</option>
      </select>
    </form>
  `,
};
