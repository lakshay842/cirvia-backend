import type { EventReview, GuestReview, HostReview, ReviewMedia, ReviewReply, ReviewType } from '@prisma/client';
import { toReviewTypeSlug } from '../utils/reviews.util.js';
import type { ReviewStatistics } from '../types/reviews.types.js';

export interface ReviewAuthorView {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
}

export interface ReviewMediaView {
  id: string;
  url: string;
  mediaType: string;
  sortOrder: number;
}

export interface ReviewReplyView {
  id: string;
  comment: string;
  author: ReviewAuthorView;
  createdAt: string;
}

export interface ReviewView {
  id: string;
  type: string;
  bookingId: string;
  rating: number;
  title: string | null;
  comment: string | null;
  wouldRecommend: boolean | null;
  helpfulCount: number;
  verifiedBooking: boolean;
  moderationStatus: string;
  author: ReviewAuthorView;
  reply: ReviewReplyView | null;
  media: ReviewMediaView[];
  createdAt: string;
  updatedAt: string;
}

type ProfileSnippet = {
  firstName: string | null;
  lastName: string | null;
  profileImage: string | null;
} | null;

type ReviewWithAuthor = (EventReview | HostReview | GuestReview) & {
  author?: { id: string; profile?: ProfileSnippet };
  reviewer?: { id: string; profile?: ProfileSnippet };
  user?: { id: string; profile?: ProfileSnippet };
  guest?: { id: string; profile?: ProfileSnippet };
};

function displayName(user: {
  profile?: { firstName: string | null; lastName: string | null } | null;
}): string {
  const first = user.profile?.firstName ?? '';
  const last = user.profile?.lastName ?? '';
  const name = `${first} ${last}`.trim();
  return name || 'User';
}

function toAuthorView(user: {
  id: string;
  profile?: ProfileSnippet;
}): ReviewAuthorView {
  return {
    id: user.id,
    displayName: displayName(user),
    profileImageUrl: user.profile?.profileImage ?? null,
  };
}

function getAuthorUser(review: ReviewWithAuthor) {
  return review.author ?? review.reviewer ?? review.user ?? review.guest;
}

export function toReviewDto(
  type: ReviewType,
  review: ReviewWithAuthor,
  options?: {
    reply?: (ReviewReply & { author: { id: string; profile?: ProfileSnippet } }) | null;
    media?: ReviewMedia[];
    userVoted?: boolean;
  },
): ReviewView {
  const authorUser = getAuthorUser(review);
  const base = {
    id: review.id,
    type: toReviewTypeSlug(type),
    bookingId: review.bookingId,
    rating: review.rating,
    helpfulCount: review.helpfulCount,
    verifiedBooking: true,
    moderationStatus: review.moderationStatus.toLowerCase(),
    author: authorUser ? toAuthorView(authorUser) : { id: '', displayName: 'User', profileImageUrl: null },
    reply: options?.reply
      ? {
          id: options.reply.id,
          comment: options.reply.comment,
          author: toAuthorView(options.reply.author),
          createdAt: options.reply.createdAt.toISOString(),
        }
      : null,
    media: (options?.media ?? []).map((m) => ({
      id: m.id,
      url: m.url,
      mediaType: m.mediaType,
      sortOrder: m.sortOrder,
    })),
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };

  if (type === 'GUEST') {
    const guestReview = review as GuestReview;
    return {
      ...base,
      title: null,
      comment: guestReview.comment,
      wouldRecommend: null,
    };
  }

  const rich = review as HostReview | EventReview;
  return {
    ...base,
    title: rich.title ?? null,
    comment: rich.comment ?? null,
    wouldRecommend: rich.wouldRecommend ?? null,
  };
}

export function toReviewStatisticsDto(stats: ReviewStatistics) {
  return stats;
}
