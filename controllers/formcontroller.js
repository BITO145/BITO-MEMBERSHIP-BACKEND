import { Form } from "../models/Forms.js";

export const postForm = (req, res) => {
  const formData = req.body;
  if (
    !formData.name ||
    !formData.email ||
    !formData.company ||
    !formData.phone ||
    !formData.designation ||
    !formData.country ||
    !formData.city ||
    !formData.purpose
  ) {
    return res
      .status(400)
      .json({ error: "Please fill in all required fields." });
  }

  if (formData.formType !== 'industrial' && formData.formType !== 'startup' && formData.formType !== 'healthcare' && formData.formType !== 'green' && formData.formType !== 'technology') {
    return res.status(400).json({ error: "Invalid form type." });
  }

  const newForm = new Form(formData);
  newForm
    .save()
    .then(() =>
      res.status(201).json({ message: "Form submitted successfully." })
    )
    .catch((error) =>
      res.status(500).json({ error: "Failed to submit form." })
    );
};

export const getForms = (req, res) => {
  const formType = req.query.formType;
  if (formType) {
    return Form.find({ formType })
      .then((forms) => res.status(200).json(forms))
      .catch((error) =>
        res.status(500).json({ error: "Failed to retrieve forms." })
      );
  }
  Form.find()
    .then((forms) => res.status(200).json(forms))
    .catch((error) =>
      res.status(500).json({ error: "Failed to retrieve forms." })
    );
};
