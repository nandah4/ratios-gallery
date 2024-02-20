const MAX_TITLE = 200;

const { PrismaClient } = require("@prisma/client");
const { badRequestMessage, successMessageWithData } = require("../utils/message");
const { verifyJwt } = require("../utils/jwt");
const { ENV_PORT } = require("../environtment");

const prisma = new PrismaClient();

// GET ALL PHOTO
const getPhoto = async (req, res) => {
  const parseToken = verifyJwt(req.headers?.authorization);
  const { query } = req.query;

  try {
    let searchQuery = {
      where: {
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            photoUrl: true,
          },
        },
      },
    };

    if (!query) {
      const photos = await prisma.photo.findMany(searchQuery);
      return res.status(200).send(successMessageWithData(photos));
    } else {
      searchQuery.where.OR = [
        {
          title: {
            contains: query,
          },
        },
        {
          description: {
            contains: query,
          },
        },
      ];
      const photos = await prisma.photo.findMany(searchQuery);
      return res.status(200).send(successMessageWithData(photos));
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send(
      badRequestMessage({
        messages: [
          {
            message:
              "Internal Server Error. Don't worry, our team is on it! In the meantime, you might want to refresh the page or come back later.",
          },
        ],
      })
    );
  }
};

// GET PHOTO BY ID PHOTO
const getPhotoById = async (req, res) => {
  const parseToken = verifyJwt(req.headers?.authorization);
  const { photoId } = req.params;

  try {
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        isDeleted: false,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        locationFile: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            photoUrl: true,
          },
        },
        comentars: {
          where: {
            isDeleted: false,
          },
          
          select: { 
            id: true,
            userId: true,
            photoId: true,
            comentar: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                photoUrl: true,
              },
            },
          },
        },
        likes: true,
        albums:true
      },
    });

    if (!photo) {
      return res.status(404).send(
        badRequestMessage({
          messages: [
            {
              field: "photoId",
              message: "Photo not found",
            },
          ],
        })
      );
    }


    const isLiked = photo.likes.some(like => like.userId === parseToken.userId);
    const isPhotoToAdded = photo.albums.length > 0;

    const responseData = {
      ...photo,
      isLiked: isLiked,
    }
    return res.status(200).send(successMessageWithData(responseData));
  } catch (error) {
    console.log(error);
    return res.status(500).send(
      badRequestMessage({
        messages: [
          {
            message:
              "Internal Server Error. Don't worry, our team is on it! In the meantime, you might want to refresh the page or come back later.",
          },
        ],
      })
    );
  }
};

// CREATE PHOTO
const createPhoto = async (req, res) => {
  const parseToken = verifyJwt(req.headers?.authorization);

  try {
    const title = req.body?.title;
    const description = req.body?.description;
    const locationFile = req.file?.filename;

    const error = [];

    if (!title) {
      error.push({
        field: "title",
        message: "Title is required when uploading a photo.",
      });
    }
    if (!description) {
      error.push({
        field: "description",
        message: "Description is required when uploading a photo.",
      });
    }
    if (!locationFile) {
      error.push({
        field: "locationFile",
        message: "File upload is required and Only JPG, JPEG and PNG files are allowed.",
      });
    }

    if (error.length !== 0) {
      return res.status(400).send(
        badRequestMessage({
          messages: [...error],
        })
      );
    }
    // Validasi Panjang Title
    if (title && title.length > MAX_TITLE) {
      return res.status(400).send(
        badRequestMessage({
          messages: [
            {
              field: "title",
              message: `Title length exceeds the maximum limit of ${MAX_TITLE} characters.`,
            },
          ],
        })
      );
    }

    const newPhoto = await prisma.photo.create({
      data: {
        title,
        description,
        locationFile,
        userId: parseToken.userId,
      },
    });

    return res.status(200).send(successMessageWithData(newPhoto));
    //         message: "Hooray! Your photo has been uploaded successfully. Celebrate the moment!"
  } catch (error) {
    console.log(error);
    return res.status(500).send(
      badRequestMessage({
        messages: [
          {
            message:
              "Internal Server Error. Don't worry, our team is on it! In the meantime, you might want to refresh the page or come back later.",
          },
        ],
      })
    );
  }
};

// UPDATE PHOTO BY ID PHOTO
const updatePhotoById = async (req, res) => {
  const parseToken = verifyJwt(req.headers?.authorization);
  const { photoId } = req.params;

  try {
    const findPhoto = await prisma.photo.findFirst({
      where: {
        id: photoId,
        userId: parseToken.userId,
        isDeleted: false,
      },
    });

    if (!findPhoto) {
      return res.status(404).send(
        badRequestMessage({
          messages: [
            {
              field: "photoId",
              message: "Photo Not Found!",
            },
          ],
        })
      );
    }

    const title = req.body?.title;
    const description = req.body?.description;
    const error = [];

    if (!title) {
      error.push({
        field: "title",
        message: "Title is required when update a photo.",
      });
    }

    if (!description) {
      error.push({
        field: "description",
        message: "Description is required when update a photo.",
      });
    }

    if (error.length !== 0) {
      return res.status(400).send(
        badRequestMessage({
          messages: [...error],
        })
      );
    }

    // Validasi Panjang Title
    if (title && title.length > MAX_TITLE) {
      return res.status(400).send(
        badRequestMessage({
          messages: [
            {
              field: "title",
              message: `Title length exceeds the maximum limit of ${MAX_TITLE} characters.`,
            },
          ],
        })
      );
    }

    const updatePhoto = await prisma.photo.update({
      where: {
        id: photoId,
        userId: parseToken.userId,
      },
      data: {
        title: title || findPhoto.title,
        description: description || findPhoto.description,
      },
    });

    return res.status(200).send(successMessageWithData(updatePhoto));
  } catch (error) {
    return res.status(500).send(
      badRequestMessage({
        messages: [
          {
            message:
              "Internal Server Error. Don't worry, our team is on it! In the meantime, you might want to refresh the page or come back later.",
          },
        ],
      })
    );
  }
};

// DELETE PHOTO
const deletePhotoById = async (req, res) => {
  const parseToken = verifyJwt(req.headers?.authorization);
  const { photoId } = req.params;
  try {
    const photoToDelete = await prisma.photo.findFirst({
      where: {
        id: photoId,
        isDeleted: false,
      },
    });

    if (!photoToDelete) {
      return res.status(404).send(
        badRequestMessage({
          messages: [
            {
              field: "photoId",
              message: "photo not found",
            },
          ],
        })
      );
    }

    if (photoToDelete.userId !== parseToken.userId) {
      return res.status(403).send(
        badRequestMessage({
          messages: [
            {
              field: "userId",
              message: "You don`t have permission to delete this foto",
            },
          ],
        })
      );
    }

    // isDeleted to true to assocciated comments
    await prisma.comentar.updateMany({
      where: {
        photoId: photoId,
      },
      data: {
        isDeleted: true,
      },
    });

    await prisma.like.deleteMany({
      where: {
        photoId: photoId,
      },
    });

    const deletePhoto = await prisma.photo.update({
      where: {
        id: photoId,
        userId: parseToken.userId,
      },
      data: {
        isDeleted: true,
      },
    });

    if (!deletePhoto) {
      return res.status(404).send(
        badRequestMessage({
          messages: [
            {
              field: "photoId",
              message: "Photo not found",
            },
          ],
        })
      );
    }

    return res.status(200).send(successMessageWithData(deletePhoto));
  } catch (error) {
    console.log(error);
    return res.status(500).send(
      badRequestMessage({
        messages: [
          {
            message:
              "Internal Server Error. Don't worry, our team is on it! In the meantime, you might want to refresh the page or come back later.",
          },
        ],
      })
    );
  }
};

module.exports = {
  getPhoto,
  getPhotoById,
  createPhoto,
  updatePhotoById,
  deletePhotoById,
};
