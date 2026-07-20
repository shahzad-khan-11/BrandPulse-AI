import UserRepository from '../repositories/UserRepository.js';
import User from '../models/User.js';
import { sendProfileUpdatedEmail } from '../services/emailService.js';
import { pushNotification } from '../services/notificationService.js';

// @desc    Get organization team users
// @route   GET /api/users
// @access  Private/Admin
export const getTeamUsers = async (req, res, next) => {
  const { page, limit, sort } = req.query;
  try {
    const results = await UserRepository.paginate(
      { organization: req.user.organization },
      { page, limit, sort }
    );
    res.json({ success: true, ...results });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  const { name, username, phoneNumber, company, bio } = req.body;

  try {
    // If username is provided, make sure it is unique
    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Username is already taken' });
      }
    }

    const updates = {
      name,
      username,
      phoneNumber,
      company,
      bio,
    };

    // If file is uploaded, set the profileImage path
    if (req.file) {
      updates.profileImage = `/uploads/${req.file.filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).populate('organization');

    // Send profile updated email notification
    sendProfileUpdatedEmail(updatedUser.email, updatedUser.name);

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
};

// @desc    Change user password
// @route   PUT /api/users/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  try {
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide old and new passwords' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.matchPassword(oldPassword))) {
      return res.status(401).json({ success: false, message: 'Invalid current password' });
    }

    user.password = newPassword; // Hashed in pre-save hook
    await user.save();

    await pushNotification({
      userId: user._id,
      organizationId: user.organization,
      title: 'Password Changed',
      message: 'Your account password was updated successfully.',
      category: 'authentication',
      priority: 'HIGH'
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a user (Soft Delete)
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res, next) => {
  try {
    const user = await UserRepository.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await UserRepository.delete(user._id);
    res.json({ success: true, message: 'User soft-deleted successfully' });
  } catch (error) {
    next(error);
  }
};
