// src/controllers/reimbursementController.js
import { Reimbursement, User, Approval } from "../models/index.js";
import { sendEmail } from "../utils/sendEmail.js";
import { getApprovalFlow, getNextApprover } from "../utils/approvalFlow.js";

// 📤 Create new reimbursement with all approval records
export async function createReimbursement(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = req.user;
    const payload = req.body;

    console.log("📝 Creating reimbursement for user:", user.name, user.role);

    // ✅ Get the full approval flow for this user's role
    const approvalFlow = getApprovalFlow(user.role);
    
    if (!approvalFlow || approvalFlow.length === 0) {
      return res.status(400).json({ 
        error: "No approval flow defined for your role",
        role: user.role 
      });
    }

    console.log("📋 Approval flow:", approvalFlow);

    const firstApprover = approvalFlow[0];

    // ✅ Create the reimbursement
    const reimbursement = await Reimbursement.create({
      user_id: user.id,
      category: payload.category,
      type: payload.type || payload.merchant || payload.category, // merchant or category as type
      description: payload.description, // purpose/description
      items: payload.items, // items if provided, else description
      merchant: payload.merchant || null,
      date: payload.date || new Date(),
      total: payload.total,
      status: "Pending",
      current_approver: firstApprover,
      receipt_url: req.file ? `/uploads/${req.file.filename}` : null,
      submitted_at: new Date(),
    });

    console.log("✅ Created reimbursement #", reimbursement.id);

    // ✅ Create all approval records upfront (one for each level)
    const approvalRecords = approvalFlow.map((role, index) => ({
      reimbursement_id: reimbursement.id,
      approver_id: null,  // Will be set when they actually approve
      approver_role: role,
      approval_level: index + 1,
      status: 'Pending',
      remarks: null,
      approved_at: null
    }));

    await Approval.bulkCreate(approvalRecords);
    console.log(`✅ Created ${approvalRecords.length} approval records`);

    // ✅ Notify first approver
    const approverUser = await User.findOne({
      where: { role: firstApprover },
    });

    if (approverUser) {
      console.log(`📧 Would notify ${approverUser.name} (${approverUser.email})`);
      /*
      await sendEmail(
        approverUser.email,
        "Reimbursement pending your approval",
        `
        <p>Hello ${approverUser.name},</p>
        <p>A reimbursement (#${reimbursement.id}) from ${user.name} requires your approval.</p>
        <p>Amount: ₱${reimbursement.total}</p>
        <p><a href="${process.env.CLIENT_URL || "http://localhost:3000"}">Open Reimbursement Tool</a></p>
        `
      );
      */
    }

    res.json({ reimbursement });
  } catch (err) {
    console.error("❌ Error creating reimbursement:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}

// 📥 Get current user's reimbursements with approval details
export async function getUserReimbursements(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    console.log("📋 Fetching reimbursements for user:", user.name);

    const reimbursements = await Reimbursement.findAll({
      where: { user_id: user.id },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "role"],
        },
        {
          model: Approval,
          as: "approvals",
          include: [
            {
              model: User,
              as: "approver",
              attributes: ["id", "name", "email", "role"],
            }
          ],
          order: [['approval_level', 'ASC']]
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    console.log(`✅ Found ${reimbursements.length} reimbursements`);

    const formattedReimbursements = reimbursements.map((r) => ({
      id: r.id,
      userId: r.user_id,
      user: r.user
        ? {
            id: r.user.id,
            name: r.user.name,
            email: r.user.email,
            role: r.user.role,
          }
        : null,
      category: r.category,
      type: r.type,
      description: r.description,
      total: r.total,
      status: r.status,
      currentApprover: r.current_approver,
      receipt: r.receipt_url,
      submittedAt: r.submitted_at || r.createdAt,
      approvedAt: r.approved_at,
      merchant: r.type,
      items: r.items,
      extractedText: null,
      approvals: r.approvals || []
    }));

    res.json(formattedReimbursements);
  } catch (err) {
    console.error("❌ Error fetching reimbursements:", err);
    res.status(500).json({ error: "Failed to fetch reimbursements" });
  }
}

// 📋 Get reimbursements pending the current user's approval
export async function getPendingApprovals(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    console.log("🔍 Fetching pending approvals for role:", user.role);

    // ✅ Find reimbursements where current_approver matches user's role
    const reimbursements = await Reimbursement.findAll({
      where: {
        current_approver: user.role,
        status: "Pending",
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "role"],
        },
        {
          model: Approval,
          as: "approvals",
          include: [
            {
              model: User,
              as: "approver",
              attributes: ["id", "name", "email", "role"],
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    console.log(`✅ Found ${reimbursements.length} pending approvals`);

    const formatted = reimbursements.map((r) => ({
      id: r.id,
      userId: r.user_id,
      user: r.user ? {
        id: r.user.id,
        name: r.user.name,
        email: r.user.email,
        role: r.user.role
      } : null,
      category: r.category,
      type: r.type,
      description: r.description,
      total: r.total,
      status: r.status,
      currentApprover: r.current_approver,
      receipt: r.receipt_url,
      date: r.createdAt,
      submittedAt: r.submitted_at || r.createdAt,
      merchant: r.merchant,
      items: r.items,
      extractedText: null,
      approvals: r.approvals || []
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ Error fetching pending approvals:", err);
    res.status(500).json({ error: "Failed to fetch pending approvals" });
  }
}

// 📝 Update reimbursement status (Legacy method - kept for backwards compatibility)
export async function updateReimbursementStatus(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!["Approved", "Rejected", "Pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const reimbursement = await Reimbursement.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "role"],
        },
      ],
    });

    if (!reimbursement) {
      return res.status(404).json({ error: "Reimbursement not found" });
    }

    // ✅ If approved, find the next approver
    if (status === "Approved") {
      const nextApprover = getNextApprover(
        reimbursement.user.role,
        reimbursement.current_approver
      );

      if (nextApprover) {
        reimbursement.current_approver = nextApprover;
        reimbursement.status = "Pending";

        const approverUser = await User.findOne({
          where: { role: nextApprover },
        });
        if (approverUser) {
          /*
          await sendEmail(
            approverUser.email,
            "New reimbursement pending your approval",
            `<p>Hello ${approverUser.name},</p>
            <p>Reimbursement (#${reimbursement.id}) from ${reimbursement.user.name} requires your approval.</p>
            <p>Amount: ₱${reimbursement.total}</p>`
          );
          */
        }
      } else {
        reimbursement.status = "Approved";
        reimbursement.approved_at = new Date();
        reimbursement.current_approver = null;
      }
    } else if (status === "Rejected") {
      reimbursement.status = "Rejected";
      reimbursement.current_approver = null;
    }

    await reimbursement.save();

    res.json({
      success: true,
      message: `Reimbursement ${status.toLowerCase()} successfully`,
      reimbursement,
    });
  } catch (err) {
    console.error("❌ Error updating reimbursement:", err);
    res.status(500).json({ error: "Failed to update reimbursement" });
  }
}