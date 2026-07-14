import mailSender from "../utils/mailSender.js";

const getContactRecipient = () => process.env.MAIL_TO || process.env.MAIL_USER;

export const contactUs = async (req, res) => {
    try {
        const { firstname, lastname, email, phone, message } = req.body;

        if (!firstname || !lastname || !email || !phone || !message) {
            return res.status(400).json({
                success: false,
                message: "All contact form fields are required",
            });
        }

        const CONTACT_RECIPIENT = getContactRecipient();
        if (!CONTACT_RECIPIENT) {
            console.error("Contact recipient is not configured. Set MAIL_TO or MAIL_USER in .env.");
            return res.status(500).json({
                success: false,
                message: "Contact email recipient is not configured",
            });
        }

        const body = `
            <h2>New Contact Request</h2>
            <p><strong>Name:</strong> ${firstname} ${lastname}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, "<br />")}</p>
        `;

        await mailSender(CONTACT_RECIPIENT, "CodeSphere Contact Form Message", body);

        return res.status(200).json({
            success: true,
            data: { message: "Contact message sent successfully" },
        });
    } catch (error) {
        console.error("Error in contact us", error);

        return res.status(500).json({
            success: false,
            message: "Error in sending contact message",
        });
    }
};